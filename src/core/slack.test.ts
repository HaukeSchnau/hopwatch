import { describe, expect, it } from 'vitest';

import type { Context, ContextId, SlackStatus } from './model';
import { appliedKey, readGrant, redirectParams, slackEmoji, slackStep } from './slack';
import { buildTree } from './tree';

const context = (id: string, extra: Partial<Context> = {}): Context => ({
  id: id as ContextId,
  parentId: null,
  name: id,
  color: null,
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  workDays: null,
  balanceSince: null,
  balanceStartMinutes: 0,
  nudgeAfterMinutes: null,
  slackStatus: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
  ...extra,
});

describe('slack status down the tree', () => {
  const remote: SlackStatus = { text: 'Working remotely', emoji: null };
  const tree = buildTree([
    context('job', { emoji: '🏡', slackStatus: remote }),
    context('meetings', { parentId: 'job' as ContextId, emoji: '📅', slackStatus: { text: 'In a meeting', emoji: '🗓️' } }),
    context('deep', { parentId: 'job' as ContextId, emoji: '🎧' }),
    context('commute', { parentId: 'job' as ContextId, slackStatus: 'none' }),
    context('dog', { emoji: '🐕', slackStatus: { text: 'Walking the dog', emoji: null } }),
    context('home'),
  ]);
  const slack = (id: string) => tree.byId.get(id as ContextId)!.slack;

  it("defaults the emoji to the jelly's own, where the status is set", () => {
    expect(slack('job')).toEqual({ text: 'Working remotely', emoji: '🏡' });
    expect(slack('dog')).toEqual({ text: 'Walking the dog', emoji: '🐕' });
  });

  it('inherits a parent status as the parent shows it, unless a child sets its own or none', () => {
    expect(slack('deep')).toEqual({ text: 'Working remotely', emoji: '🏡' });
    expect(slack('meetings')).toEqual({ text: 'In a meeting', emoji: '🗓️' });
    expect(slack('commute')).toBeNull();
    expect(slack('home')).toBeNull();
  });
});

describe('slackEmoji', () => {
  it("finds Slack's name, ignoring variation selectors and skin tones", () => {
    expect(slackEmoji('🐶')).toBe(':dog:');
    expect(slackEmoji('🗓️')).toBe(':spiral_calendar_pad:');
    expect(slackEmoji('☕')).toBe(':coffee:');
    expect(slackEmoji('👋🏽')).toBe(':wave:');
    expect(slackEmoji('🏃🏽‍♀️')).toBe(':woman-running:');
  });

  it("is empty when Slack has no name, so Slack shows its default", () => {
    expect(slackEmoji(null)).toBe('');
    expect(slackEmoji('J')).toBe('');
  });
});

describe('slackStep', () => {
  const walk = { text: 'Walking the dog', emoji: ':dog:' };
  const empty = { text: '', emoji: '' };

  it('sets a status over an empty one or its own', () => {
    expect(slackStep(walk, empty, null)).toEqual({ kind: 'set', status: walk });
    expect(slackStep(walk, { text: 'Working remotely', emoji: ':house:' }, 'Working remotely')).toEqual({ kind: 'set', status: walk });
  });

  it('clears only its own status', () => {
    expect(slackStep(null, walk, 'Walking the dog')).toEqual({ kind: 'clear' });
    expect(slackStep(null, empty, 'Walking the dog')).toEqual({ kind: 'leave' });
  });

  it('leaves a status someone set by hand', () => {
    const vacation = { text: 'On vacation', emoji: ':palm_tree:' };
    expect(slackStep(walk, vacation, 'Walking the dog')).toEqual({ kind: 'leave' });
    expect(slackStep(null, vacation, null)).toEqual({ kind: 'leave' });
  });

  it('renews the key every day', () => {
    const day = Date.UTC(2026, 9, 15, 10);
    expect(appliedKey(walk, day)).toBe(appliedKey(walk, day + 3600_000));
    expect(appliedKey(walk, day)).not.toBe(appliedKey(walk, day + 86_400_000));
    expect(appliedKey(null, day)).toBe('none');
  });
});

describe('readGrant', () => {
  const now = 1_000_000;

  it('reads the user token of a first sign-in', () => {
    const answer = {
      ok: true,
      authed_user: { id: 'U1', access_token: 'xoxe.xoxp-a', refresh_token: 'xoxe-1-r', expires_in: 43200, token_type: 'user' },
      team: { id: 'T1', name: 'Urbs' },
    };
    expect(readGrant(answer, now)).toEqual({
      ok: true,
      grant: { access: 'xoxe.xoxp-a', refresh: 'xoxe-1-r', expiresAt: now + 43200_000, team: 'Urbs', teamId: 'T1', userId: 'U1' },
    });
  });

  it('reads a refresh at the top level and keeps what it leaves out', () => {
    const before = { access: 'old', refresh: 'old-r', expiresAt: 0, team: 'Urbs', teamId: 'T1', userId: 'U1' };
    const answer = { ok: true, access_token: 'new', refresh_token: 'new-r', expires_in: 43200 };
    expect(readGrant(answer, now, before)).toEqual({ ok: true, grant: { ...before, access: 'new', refresh: 'new-r', expiresAt: now + 43200_000 } });
  });

  it("passes on Slack's error", () => {
    expect(readGrant({ ok: false, error: 'invalid_refresh_token' }, now)).toEqual({ ok: false, error: 'invalid_refresh_token' });
  });
});

it('reads the redirect', () => {
  expect(redirectParams('hopwatch://slack-auth?code=1.2%2B3&state=abc')).toEqual({ code: '1.2+3', state: 'abc' });
});
