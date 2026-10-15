// Slack as the app uses it: signing in (PKCE in the system's browser sheet), the connected
// workspace for Settings, and on Android the client that keeps the status in line with the
// running jelly, in the app and headless after a tap. iOS runs its client natively
// (modules/system-surfaces/ios/Slack.swift) so a tap on the Live Activity reaches Slack
// without JavaScript; here it only hands over the tokens. The rules are in slack.ts.

import { systemSurfaces } from '@modules/system-surfaces';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import {
  appliedKey,
  authorizeUrl,
  base64url,
  formBody,
  readGrant,
  redirectParams,
  SIGNED_OUT,
  SLACK_CLIENT_ID,
  SLACK_REDIRECT,
  type SlackGrant,
  slackExpiry,
  type SlackShown,
  slackStep,
  type SlackWire,
  slackWire,
} from './slack';
import { useHopwatch } from './store';
import { findOpen } from './timeline';

/** The connected workspace; `broken` once Slack refused the tokens, until signing in again. */
export interface SlackLink {
  team: string;
  broken: boolean;
}

/** iOS's native client, in builds that have it. */
const native = Platform.OS === 'ios' && typeof systemSurfaces?.slackLink === 'function' ? systemSurfaces : null;

/** Whether this build can connect Slack at all. */
export const slackAvailable = SLACK_CLIENT_ID !== '' && (native !== null || Platform.OS === 'android');

let link: SlackLink | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function publish(next: SlackLink | null) {
  if (next?.team === link?.team && next?.broken === link?.broken) return;
  link = next;
  for (const listener of listeners) listener();
}

/** Reads the connected workspace again. */
export async function refreshSlackLink() {
  if (native) return publish(native.slackLink());
  const saved = await load();
  publish(saved ? { team: saved.team, broken: saved.broken } : null);
}

/** The connected workspace, or null. Reads it again whenever a screen using it shows. */
export function useSlackLink(): SlackLink | null {
  useEffect(() => {
    if (slackAvailable) refreshSlackLink();
  }, []);
  return useSyncExternalStore(subscribe, () => link);
}

export type ConnectResult = 'connected' | 'cancelled' | 'failed';

/** Signs in to Slack in the system's browser sheet; the tokens stay on this phone. */
export async function connectSlack(): Promise<ConnectResult> {
  const verifier = (Crypto.randomUUID() + Crypto.randomUUID()).replace(/-/g, '');
  const challenge = base64url(
    await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }),
  );
  const state = Crypto.randomUUID();
  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl(challenge, state), SLACK_REDIRECT);
  if (result.type !== 'success') return 'cancelled';
  const params = redirectParams(result.url);
  if (params.state !== state) return 'failed';
  if (!params.code) return params.error === 'access_denied' ? 'cancelled' : 'failed';
  try {
    const answer = await api('oauth.v2.access', {
      form: { client_id: SLACK_CLIENT_ID, code: params.code, code_verifier: verifier, redirect_uri: SLACK_REDIRECT },
    });
    const read = readGrant(answer, Date.now());
    if (!read.ok) return 'failed';
    if (native) await native.slackConnect(JSON.stringify({ ...read.grant, clientId: SLACK_CLIENT_ID }));
    else {
      await serially(() => save({ ...read.grant, clientId: SLACK_CLIENT_ID, broken: false, ours: null, applied: null }));
      syncSlack();
    }
    await refreshSlackLink();
    return 'connected';
  } catch {
    return 'failed';
  }
}

/** Clears the status Hopwatch set, signs out of Slack and forgets the tokens. */
export async function disconnectSlack() {
  if (native) await native.slackDisconnect();
  else
    await serially(async () => {
      const saved = await load();
      await save(null);
      if (!saved || saved.broken) return;
      try {
        const fresh = await freshen(saved);
        if (saved.ours !== null && (await shown(fresh.access)).text === saved.ours) await setStatus(fresh.access, { text: '', emoji: '' }, 0);
        await call('auth.revoke', { token: fresh.access });
      } catch {
        // Offline: the tokens are gone from here either way, and the status runs out at midnight.
      }
    });
  await refreshSlackLink();
}

// Android's client from here.

interface Saved extends SlackGrant {
  clientId: string;
  broken: boolean;
  /** The text of the status this client set, so it never touches one set by hand. */
  ours: string | null;
  /** What Slack was last brought in line with (`appliedKey`). */
  applied: string | null;
}

const KEY = 'slack.link';
/** The last `applied` saved by this process, so a store change that doesn't matter costs nothing. */
let appliedHere: string | null = null;

async function load(): Promise<Saved | null> {
  try {
    const json = await SecureStore.getItemAsync(KEY);
    return json ? (JSON.parse(json) as Saved) : null;
  } catch {
    return null;
  }
}

async function save(saved: Saved | null) {
  appliedHere = saved?.applied ?? null;
  if (saved) await SecureStore.setItemAsync(KEY, JSON.stringify(saved));
  else await SecureStore.deleteItemAsync(KEY);
}

/** One call at a time: overlapping refreshes would spend the same rotating token twice. */
let queue: Promise<void> = Promise.resolve();
function serially(work: () => Promise<void>): Promise<void> {
  queue = queue.then(work).catch(() => {});
  return queue;
}

/** The running jelly's status, or none. */
function wanted(): SlackWire | null {
  const { entries, tree } = useHopwatch.getState();
  const open = findOpen(entries);
  return open ? slackWire(tree.byId.get(open.contextId)?.slack ?? null) : null;
}

/**
 * Android: brings Slack in line with the running jelly. Cheap when nothing changed; after a
 * failed call the next sync tries again. iOS's native client syncs on its own.
 */
export function syncSlack(): Promise<void> {
  if (Platform.OS !== 'android' || !slackAvailable) return Promise.resolve();
  const now = Date.now();
  const want = wanted();
  const key = appliedKey(want, now);
  if (key === appliedHere) return Promise.resolve();
  return serially(async () => {
    let saved = await load();
    if (!saved || saved.broken || saved.applied === key) {
      appliedHere = saved?.applied ?? null;
      return;
    }
    try {
      const fresh = await freshen(saved);
      // A refresh spent the old refresh token: keep the new one before anything else.
      if (fresh !== saved) await save((saved = fresh));
      const step = slackStep(want, await shown(saved.access), saved.ours);
      if (step.kind === 'set') await setStatus(saved.access, step.status, slackExpiry(now));
      if (step.kind === 'clear') await setStatus(saved.access, { text: '', emoji: '' }, 0);
      await save({ ...saved, ours: step.kind === 'set' ? step.status.text : null, applied: key });
    } catch (error) {
      if (error instanceof SlackError && SIGNED_OUT.has(error.code)) {
        await save({ ...saved, broken: true });
        await refreshSlackLink();
      }
    }
  });
}

/** Refreshes the access token when it's about to run out. Tokens rotate: save the result. */
async function freshen(saved: Saved): Promise<Saved> {
  if (saved.expiresAt - 60_000 > Date.now()) return saved;
  const answer = await api('oauth.v2.access', {
    form: { client_id: saved.clientId, grant_type: 'refresh_token', refresh_token: saved.refresh },
  });
  const read = readGrant(answer, Date.now(), saved);
  if (!read.ok) throw new SlackError(read.error);
  return { ...saved, ...read.grant };
}

async function shown(token: string): Promise<SlackShown> {
  const profile = ((await call('users.profile.get', { token })).profile ?? {}) as Record<string, unknown>;
  return {
    text: typeof profile.status_text === 'string' ? profile.status_text : '',
    emoji: typeof profile.status_emoji === 'string' ? profile.status_emoji : '',
  };
}

async function setStatus(token: string, status: SlackWire, expiration: number): Promise<void> {
  try {
    await call('users.profile.set', {
      token,
      json: { profile: { status_text: status.text, status_emoji: status.emoji, status_expiration: expiration } },
    });
  } catch (error) {
    // An emoji this workspace doesn't have: Slack's default instead.
    if (error instanceof SlackError && error.code.endsWith('not_valid_emoji') && status.emoji) return setStatus(token, { ...status, emoji: '' }, expiration);
    throw error;
  }
}

// Slack's Web API.

class SlackError extends Error {
  constructor(readonly code: string) {
    super(`Slack: ${code}`);
  }
}

interface Request {
  token?: string;
  form?: Record<string, string>;
  json?: unknown;
}

/** A Web API call's answer, `ok` or not. */
async function api(method: string, { token, form, json }: Request): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = formBody(form);
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    body = JSON.stringify(json);
  }
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 10_000);
  try {
    const response = await fetch(`https://slack.com/api/${method}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body,
      signal: abort.signal,
    });
    return (await response.json()) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

/** A Web API call that has to succeed. */
async function call(method: string, request: Request) {
  const answer = await api(method, request);
  if (answer.ok !== true) throw new SlackError(typeof answer.error === 'string' ? answer.error : 'unreadable');
  return answer;
}
