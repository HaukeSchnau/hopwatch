import { describe, expect, it } from 'vitest';

import type { Context, ContextId } from './model';
import { appliedKey, readGrant, redirectParams, SLACK_RECHECK_MS, slackDue, slackPlan } from './slack';
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

describe('slack status in the tree', () => {
  const tree = buildTree([
    context('job', { emoji: '🏡', slackStatus: { text: 'Working remotely', emoji: null } }),
    context('meetings', { parentId: 'job' as ContextId, emoji: '📅', slackStatus: { text: 'In a meeting', emoji: '🗓️' } }),
    context('deep', { parentId: 'job' as ContextId, emoji: '🎧' }),
  ]);
  const slack = (id: string) => tree.byId.get(id as ContextId)!.slack;

  it("defaults the emoji to the jelly's own", () => {
    expect(slack('job')).toEqual({ text: 'Working remotely', emoji: '🏡' });
    expect(slack('meetings')).toEqual({ text: 'In a meeting', emoji: '🗓️' });
  });

  it('belongs only to the jelly it was given to, not to the ones inside it', () => {
    expect(slack('deep')).toBeNull();
  });
});

describe('slack sync with a calendar app', () => {
  const MIN = 60_000;
  const now = Date.UTC(2026, 9, 23, 9, 0);
  const walk = { text: 'Walking the dog', emoji: '🐕' };
  const remote = { text: 'Working remotely', emoji: '🏡' };
  const nothing = { text: '', emoji: '', until: 0 };
  const showing = (status: { text: string; emoji: string }, until = 0) => ({ ...status, until });
  const meeting = (end: number) => ({ text: 'In a meeting', emoji: ':spiral_calendar_pad:', until: end });
  const fresh = { ours: null, applied: null, checkedAt: 0 };
  const after = (memory: typeof fresh, want: typeof walk | null, key: string) => ({ ...memory, ours: want?.text ?? null, applied: key, checkedAt: now });

  it('sets a status over an empty one or its own, and looks again in half an hour', () => {
    const key = appliedKey(walk, now);
    expect(slackPlan(walk, nothing, fresh, key, now)).toEqual({ step: { kind: 'set', status: walk }, memory: after(fresh, walk, key), wakeAt: now + SLACK_RECHECK_MS });
    const ours = { ...fresh, ours: remote.text };
    expect(slackPlan(walk, showing(remote), ours, key, now).step).toEqual({ kind: 'set', status: walk });
  });

  it('lets a meeting win, keeps knowing its own status, and looks again when the meeting ends', () => {
    const end = now + 30 * MIN;
    const memory = { ours: walk.text, applied: appliedKey(walk, now), checkedAt: now - MIN };
    const key = appliedKey(remote, now);
    expect(slackPlan(remote, meeting(end), memory, key, now)).toEqual({
      step: { kind: 'leave' },
      memory: { ours: walk.text, applied: key, checkedAt: now },
      wakeAt: end + 2 * MIN,
    });
  });

  it('after the meeting, replaces its old status the calendar app put back, or fills the empty one', () => {
    const key = appliedKey(remote, now);
    const waited = { ours: walk.text, applied: key, checkedAt: now - 40 * MIN };
    expect(slackPlan(remote, showing(walk), waited, key, now).step).toEqual({ kind: 'set', status: remote });
    expect(slackPlan(remote, nothing, waited, key, now).step).toEqual({ kind: 'set', status: remote });
  });

  it('leaves its own status alone when it already shows, until the next switch or day', () => {
    const key = appliedKey(walk, now);
    const memory = { ours: walk.text, applied: key, checkedAt: now - 40 * MIN };
    expect(slackPlan(walk, showing(walk), memory, key, now).step).toEqual({ kind: 'leave' });
    const tomorrow = now + 24 * 60 * MIN;
    expect(slackPlan(walk, showing(walk), memory, appliedKey(walk, tomorrow), tomorrow).step).toEqual({ kind: 'set', status: walk });
  });

  it('clears only its own status, also once a meeting is over', () => {
    const key = appliedKey(null, now);
    const memory = { ours: walk.text, applied: appliedKey(walk, now), checkedAt: now - MIN };
    expect(slackPlan(null, showing(walk), memory, key, now)).toEqual({ step: { kind: 'clear' }, memory: { ours: null, applied: key, checkedAt: now }, wakeAt: null });
    // A meeting covers it: look again at its end, in case the calendar app puts it back.
    expect(slackPlan(null, meeting(now + 10 * MIN), memory, key, now).wakeAt).toBe(now + 12 * MIN);
    expect(slackPlan(null, meeting(now + 10 * MIN), fresh, key, now).wakeAt).toBeNull();
  });

  it('waits out a status set by hand, looking again every half hour when it has no end', () => {
    const vacation = { text: 'On vacation', emoji: ':palm_tree:', until: 0 };
    const key = appliedKey(walk, now);
    expect(slackPlan(walk, vacation, fresh, key, now)).toMatchObject({ step: { kind: 'leave' }, wakeAt: now + SLACK_RECHECK_MS });
  });

  it('asks Slack after a switch, every half hour, or on demand after a minute', () => {
    const key = appliedKey(walk, now);
    const checked = { ours: walk.text, applied: key, checkedAt: now - 5 * MIN };
    expect(slackDue(checked, appliedKey(remote, now), now, false)).toBe(true);
    expect(slackDue(checked, key, now, false)).toBe(false);
    expect(slackDue(checked, key, now, true)).toBe(true);
    expect(slackDue({ ...checked, checkedAt: now - 31 * MIN }, key, now, false)).toBe(true);
    // Nothing to show and nothing of its own out there: no reason to ask.
    expect(slackDue({ ours: null, applied: 'none', checkedAt: 0 }, 'none', now, true)).toBe(false);
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
