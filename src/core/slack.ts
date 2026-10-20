// Slack status sync, the parts both platforms share: the status as Slack takes it, the
// sign-in URL and token answers, and the rule for what to do with someone's status. The client
// itself runs where taps run: in Swift on iOS (modules/system-surfaces/ios/Slack.swift),
// so a tap on the Live Activity reaches Slack while JavaScript sleeps, and in JavaScript
// on Android (slack-link.ts), headless after a tap. The Swift client mirrors `slackStep`
// and `appliedKey`. Pure, so it's tested without React Native.

import { addDays, dayKey, startOfDay } from './time';
import type { SlackLine } from './tree';

/** Hopwatch's Slack app. Public: the sign-in uses PKCE, no secret. */
export const SLACK_CLIENT_ID = '12359272740515.12360250962741';
/**
 * Another Slack app's client id to sign in with instead, set by a hopwatch://slack-app link
 * (links.ts): a personal Slack app with its own name, for a workspace that should list that
 * one. Device-local; a connection keeps the app it was made with.
 */
export const SLACK_APP_PREF = 'slack.app';
/** Slack only takes a custom scheme with PKCE, as a "desktop" redirect. */
export const SLACK_REDIRECT = 'hopwatch://slack-auth';
const USER_SCOPES = 'users.profile:read,users.profile:write';

/**
 * A status the way Slack takes it. The emoji is the jelly's own, like 🐕, or '' for Slack's
 * default: Slack turns an emoji into its name itself (":dog:", ":wave::skin-tone-4:"), and
 * refuses one it doesn't know, which the clients then send without.
 */
export interface SlackWire {
  text: string;
  emoji: string;
}

/** A jelly's resolved status as Slack takes it. Slack allows 100 characters. */
export const slackWire = (line: SlackLine | null): SlackWire | null =>
  line ? { text: line.text.trim().slice(0, 100), emoji: line.emoji ?? '' } : null;

/**
 * When a status Hopwatch sets runs out on its own: the next local midnight, so a phone that
 * dies mid-walk doesn't leave "Walking the dog" up for days. Each day's first sync renews it.
 * In epoch seconds, as Slack wants it.
 */
export const slackExpiry = (now: number) => Math.floor(addDays(startOfDay(now), 1) / 1000);

/**
 * What a client last brought Slack in line with. Syncing again with the same key is a no-op;
 * the day is part of it so the expiry renews daily.
 */
export const appliedKey = (want: SlackWire | null, now: number) => (want ? `${want.text}|${want.emoji}|${dayKey(now)}` : 'none');

/** What Slack shows now (users.profile.get). */
export interface SlackShown {
  text: string;
  emoji: string;
}

export type SlackStep = { kind: 'set'; status: SlackWire } | { kind: 'clear' } | { kind: 'leave' };

/**
 * What to do so Slack shows `want`. Hopwatch only changes a status it set itself (`ours`,
 * the text it last set) or an empty one, so a status someone set by hand stays.
 */
export function slackStep(want: SlackWire | null, shown: SlackShown, ours: string | null): SlackStep {
  const mine = ours !== null && shown.text === ours;
  const empty = shown.text === '' && shown.emoji === '';
  if (!mine && !empty) return { kind: 'leave' };
  if (want) return { kind: 'set', status: want };
  return mine ? { kind: 'clear' } : { kind: 'leave' };
}

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

/** Slack's sign-in page, asking to read and set the person's profile (their status). */
export const authorizeUrl = (clientId: string, challenge: string, state: string) =>
  `https://slack.com/oauth/v2/authorize?${query({
    client_id: clientId,
    user_scope: USER_SCOPES,
    redirect_uri: SLACK_REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })}`;

/** The form body for a POST to Slack's Web API. */
export const formBody = query;

/** Base64 to the URL-safe, unpadded form PKCE wants. */
export const base64url = (base64: string) => base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** The query parameters of the redirect Slack sends back. */
export function redirectParams(url: string): Record<string, string> {
  const search = url.split('?')[1]?.split('#')[0] ?? '';
  return Object.fromEntries(
    search
      .split('&')
      .filter(Boolean)
      .map((pair) => {
        const [k, v = ''] = pair.split('=');
        return [decodeURIComponent(k), decodeURIComponent(v.replace(/\+/g, ' '))];
      }),
  );
}

/** A person's Slack sign-in. Tokens rotate: each refresh brings a new pair. */
export interface SlackGrant {
  access: string;
  refresh: string;
  /** When `access` runs out, epoch ms. */
  expiresAt: number;
  team: string;
  teamId: string;
  userId: string;
}

export type GrantAnswer = { ok: true; grant: SlackGrant } | { ok: false; error: string };

const record = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const string = (v: unknown) => (typeof v === 'string' ? v : '');

/**
 * Reads oauth.v2.access's answer. The first sign-in has the user's tokens under
 * `authed_user`; a refresh may have them at the top, and keeps the team from `before`.
 */
export function readGrant(json: unknown, now: number, before?: SlackGrant): GrantAnswer {
  const answer = record(json);
  if (answer.ok !== true) return { ok: false, error: string(answer.error) || 'unreadable' };
  const authed = record(answer.authed_user);
  const user = typeof authed.access_token === 'string' ? authed : answer;
  const team = record(answer.team);
  const grant: SlackGrant = {
    access: string(user.access_token),
    refresh: string(user.refresh_token),
    expiresAt: now + (typeof user.expires_in === 'number' ? user.expires_in : 0) * 1000,
    team: string(team.name) || before?.team || '',
    teamId: string(team.id) || before?.teamId || '',
    userId: string(authed.id) || string(answer.user_id) || before?.userId || '',
  };
  if (!grant.access || !grant.refresh) return { ok: false, error: 'no_token' };
  return { ok: true, grant };
}

/** Errors after which only signing in again helps. */
export const SIGNED_OUT = new Set(['invalid_auth', 'not_authed', 'token_revoked', 'token_expired', 'invalid_refresh_token', 'account_inactive', 'missing_scope']);
