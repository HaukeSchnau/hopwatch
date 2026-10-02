import { describe, expect, it } from 'vitest';

import type { Context, ContextId, Entry, EntryId } from './model';
import { jellyChoices, readSentence, type SentenceAnswer } from './sentence';
import { buildTree } from './tree';

// Wednesday 30 September 2026, local time.
const at = (h: number, m = 0, day = 30) => new Date(2026, 8, day, h, m).getTime();
const NOW = at(15, 10);

const context = (id: string, name: string, parentId: string | null = null): Context => ({
  id: id as ContextId,
  parentId: parentId as ContextId | null,
  name,
  color: null,
  emoji: null,
  pinPosition: null,
  sortOrder: 0,
  weeklyTargetMinutes: null,
  nudgeAfterMinutes: null,
  archivedAt: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});
const tree = buildTree([
  context('deep', 'Deep work'),
  context('lunch', 'Lunch'),
  context('acme', 'Acme'),
  context('acme-web', 'Website', 'acme'),
  context('stint', 'Stint'),
  context('stint-web', 'Website', 'stint'),
]);

const entry = (id: string, contextId: string, start: number, end: number | null): Entry => ({
  id: id as EntryId,
  contextId: contextId as ContextId,
  startUtc: start,
  startOffsetMinutes: 120,
  endUtc: end,
  endOffsetMinutes: end === null ? null : 120,
  note: null,
  createdAt: 0,
  updatedAt: 0,
  deletedAt: null,
});
// Lunch 07:00–09:00 and 09:30–10:00, then Deep work running since 13:00.
const entries = [entry('a', 'lunch', at(7), at(9)), entry('b', 'lunch', at(9, 30), at(10)), entry('c', 'deep', at(13), null)];

// By default the sentence says what the fields say, as far as numbers go.
const read = (fields: Partial<SentenceAnswer>, now = NOW, list: readonly Entry[] = entries, sentence = Object.values(fields).join(' ')) =>
  readSentence(sentence, { action: 'log', jelly: 'Deep work', day: 'today', from: '', to: '', minutes: '', part: 'none', ...fields }, { tree, entries: list, now });

describe('reading a sentence', () => {
  it('backdates a start to the latest past clock time, a.m. or p.m.', () => {
    expect(read({ action: 'start', from: '09:00' })).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(9) } });
    expect(read({ action: 'start', from: '9:00' }, at(22))).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(21) } });
    expect(read({ action: 'start', from: 'since 9 am' }, at(22))).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(9) } });
    expect(read({ action: 'start', from: '23:30' }, at(0, 10))).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(23, 30, 29) } });
    expect(read({ action: 'start', minutes: '20' })).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(14, 50) } });
    // A clock time beats minutes the model read out of it.
    expect(read({ action: 'start', from: '9:30', minutes: '30' })).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(9, 30) } });
    expect(read({ action: 'start', from: '09:00' }, at(8, 30))).toEqual({ problem: '09:00 is still to come' });
  });

  it('reads block ends past noon and small hours as the afternoon', () => {
    const block = (from: number, to: number) => ({ plan: { kind: 'place', contextId: 'deep', from, to } });
    expect(read({ from: '12:30', to: '1:15' })).toEqual(block(at(12, 30), at(13, 15)));
    expect(read({ from: '2:00', to: '4:00' }, at(17))).toEqual(block(at(14), at(16)));
    expect(read({ day: 'yesterday', from: '22:00', to: '01:00' })).toEqual(block(at(22, 0, 29), at(1)));
    expect(read({ from: '14:00', to: 'now' })).toEqual(block(at(14), NOW));
    expect(read({ from: '14:00', minutes: '90' })).toEqual(block(at(14), NOW));
    expect(read({ from: '13:00', minutes: '1h30', to: 'none' })).toEqual(block(at(13), at(14, 30)));
    expect(read({ from: '9 Uhr', to: '0', minutes: '2 Stunden' })).toEqual(block(at(9), at(11)));
    expect(read({ from: '16:00', to: '17:00' })).toEqual({ problem: '16:00 is still to come' });
  });

  it('puts a block with only a length in the gap nearest its part of the day, else at its usual hour', () => {
    const morning = (length: string) => read({ minutes: length, part: 'morning' });
    expect(morning('30')).toEqual({ plan: { kind: 'place', contextId: 'deep', from: at(9), to: at(9, 30) } });
    expect(morning('120')).toEqual({ plan: { kind: 'place', contextId: 'deep', from: at(10), to: at(12) } });
    expect(morning('180')).toEqual({ plan: { kind: 'place', contextId: 'deep', from: at(8), to: at(11) } });
    expect(read({ minutes: '30' })).toEqual({ plan: { kind: 'place', contextId: 'deep', from: at(14, 40), to: NOW } });
    expect(read({ minutes: '60', part: 'evening' })).toEqual({ problem: '19:00 is still to come' });
  });

  it('stops the running entry, but not before it started', () => {
    expect(read({ action: 'stop', to: '2:00' })).toEqual({ plan: { kind: 'stop', at: at(14) } });
    expect(read({ action: 'stop', minutes: '10' })).toEqual({ plan: { kind: 'stop', at: at(15) } });
    expect(read({ action: 'stop', to: '5 Minuten', minutes: '5' })).toEqual({ plan: { kind: 'stop', at: at(15, 5) } });
    expect(read({ action: 'stop', to: 'quarter to 3' })).toEqual({ plan: { kind: 'stop', at: at(14, 45) } });
    expect(read({ action: 'stop', to: 'halb 3' })).toEqual({ plan: { kind: 'stop', at: at(14, 30) } });
    expect(read({ action: 'stop', to: '12:00' })).toEqual({ problem: "That's before Deep work started at 13:00" });
    expect(read({ action: 'stop' }, NOW, entries.slice(0, 2))).toEqual({ problem: 'Nothing is running' });
  });

  it("says what it can't do, and ignores what isn't about time", () => {
    expect(read({ day: 'other', minutes: '60' })).toEqual({ problem: 'Only today and yesterday work' });
    // Days named in the sentence beat the model's guess: 30 September 2026 is a Wednesday.
    expect(read({ day: 'yesterday', minutes: '120' }, NOW, entries, 'last monday 2h deep work')).toEqual({ problem: 'Only today and yesterday work' });
    expect(read({ day: 'today', from: '14:00', to: '16:00' }, NOW, entries, 'gestern 14-16 Uhr')).toEqual({
      plan: { kind: 'place', contextId: 'deep', from: at(14, 0, 29), to: at(16, 0, 29) },
    });
    expect(read({ jelly: 'none', minutes: '60' })).toEqual({ problem: "Couldn't tell which jelly" });
    expect(read({ day: 'yesterday', from: '10:00' })).toEqual({ problem: 'Say how long, or until when' });
    expect(read({ day: 'yesterday', from: '06:00', to: '23:30' })).toEqual({ problem: "That's longer than 16 hours" });
    expect(read({ action: 'none' })).toBeNull();
    // A block with only a start, today, means it's still going.
    expect(read({ from: '14:00' })).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(14) } });
  });
});

describe('reading the sentence itself', () => {
  const block = (contextId: string, from: number, to: number) => ({ plan: { kind: 'place', contextId, from, to } });

  it('takes ranges written with digits over the model', () => {
    expect(read({ from: '12:00', to: '12:10', minutes: '10' }, NOW, entries, 'deep work 12-1')).toEqual(block('deep', at(12), at(13)));
    expect(read({ from: '9:00', to: '11:00' }, NOW, entries, 'deep work von 9 bis 11 Uhr')).toEqual(block('deep', at(9), at(11)));
    // A length isn't a range.
    expect(read({ minutes: '150' }, NOW, entries, 'deep work 2-3 hours')).toEqual(block('deep', at(12, 40), NOW));
  });

  it('takes a jelly the sentence names over the model', () => {
    expect(read({ jelly: 'Lunch', from: '10:00', to: '11:00' }, NOW, entries, 'meeting with Acme 10-11')).toEqual(block('acme', at(10), at(11)));
    expect(read({ jelly: 'Acme › Website', minutes: '60' }, NOW, entries, 'stint website 1h')).toEqual(block('stint-web', at(14, 10), NOW));
    expect(read({ jelly: 'Acme › Website', minutes: '60' }, NOW, entries, 'acme website 1h')).toEqual(block('acme-web', at(14, 10), NOW));
  });

  it('takes minutes ago written with digits over a clock time', () => {
    expect(read({ action: 'stop', to: '5:00', minutes: '5' }, NOW, entries, 'Feierabend vor 5 Minuten')).toEqual({ plan: { kind: 'stop', at: at(15, 5) } });
    expect(read({ action: 'start', from: '20:00' }, NOW, entries, 'deep work 20 min ago')).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(14, 50) } });
  });

  it('ignores times and lengths the sentence never mentions', () => {
    expect(read({ jelly: 'Lunch', from: '10:30', to: '11:00', minutes: '30', part: 'morning' }, NOW, entries, "what's the weather like")).toEqual({
      problem: 'Say how long, or until when',
    });
    expect(read({ jelly: 'Lunch', minutes: '30', part: 'noon' }, NOW, entries, 'half an hour of lunch')).toEqual(block('lunch', at(12), at(12, 30)));
  });

  it('reads "since" as still going', () => {
    expect(read({ from: '9:30', minutes: '60' }, NOW, entries, 'deep work since 9:30')).toEqual({ plan: { kind: 'start', contextId: 'deep', at: at(9, 30) } });
  });
});

describe('jelly choices', () => {
  it('uses names, and paths where a name repeats', () => {
    expect([...jellyChoices(tree).keys()]).toEqual(['Acme', 'Acme › Website', 'Deep work', 'Lunch', 'Stint', 'Stint › Website']);
  });
});
