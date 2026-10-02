/// <reference types="node" />
// Evaluates typed logging (src/core/sentence.ts) against Apple's on-device model on the M1:
// each phrase goes through the app's own request and resolver, against the sample data's
// jellies, at a fixed "now" (Wednesday 30 September 2026, 15:10, Berlin). Prints a Markdown
// table of phrase, model answer, plan, verdict and latency. Run from the repo root, with
// the `@/` paths and the React Native stub vitest uses (src/i18n reads the language through
// React Native; the stub makes it English):
//
//   TZ=Europe/Berlin node -e "import('vite').then((v) => v.runnerImport('./scripts/sentence-eval.ts', { resolve: { tsconfigPaths: true, alias: { 'react-native': process.cwd() + '/src/test/react-native.ts' } } }))"
//
// Set ONLY=<substring> to run matching phrases.

import { spawnSync } from 'node:child_process';

import { sampleData } from '../src/core/sample';
import { type Plan, readSentence, sentenceRequest } from '../src/core/sentence';
import { formatClock, offsetAt, startOfDay } from '../src/core/time';
import { buildTree } from '../src/core/tree';

const NOW = new Date(2026, 8, 30, 15, 10).getTime();

/** What a phrase should become. Times are HH:MM; a block's day defaults to today. */
type Expected =
  | { kind: 'start'; jelly: string; at: string }
  | { kind: 'place'; jelly: string; from?: string; to?: string; minutes?: number; day?: 'yesterday'; within?: [string, string] }
  | { kind: 'stop'; at: string }
  | { kind: 'problem' }
  | { kind: 'ignored' };

const cases: [phrase: string, expected: Expected | Expected[]][] = [
  ['deep work since 9', { kind: 'start', jelly: 'Deep work', at: '09:00' }],
  ['started cooking 20 min ago', { kind: 'start', jelly: 'Cooking', at: '14:50' }],
  ['2h deep work this morning', { kind: 'place', jelly: 'Deep work', minutes: 120, within: ['06:00', '12:00'] }],
  ['lunch 12:30 to 13:15', { kind: 'place', jelly: 'Lunch', from: '12:30', to: '13:15' }],
  ['meeting with Acme 10–11 yesterday', { kind: 'place', jelly: 'Acme', from: '10:00', to: '11:00', day: 'yesterday' }],
  ['stopped at 3', { kind: 'stop', at: '15:00' }],
  ['done 10 min ago', { kind: 'stop', at: '15:00' }],
  ['9 to 11 deep work', { kind: 'place', jelly: 'Deep work', from: '09:00', to: '11:00' }],
  ['deep work from 2 until now', [{ kind: 'place', jelly: 'Deep work', from: '14:00', to: '15:10' }, { kind: 'start', jelly: 'Deep work', at: '14:00' }]],
  ['half an hour of lunch', { kind: 'place', jelly: 'Lunch', minutes: 30 }],
  ['gestern 14-16 Uhr Kunde Acme', { kind: 'place', jelly: 'Acme', from: '14:00', to: '16:00', day: 'yesterday' }],
  ['seit 10 Uhr Deep Work', { kind: 'start', jelly: 'Deep work', at: '10:00' }],
  ['Mittagessen von 12 bis 13 Uhr', { kind: 'place', jelly: 'Lunch', from: '12:00', to: '13:00' }],
  ['vor 15 Minuten mit Kochen angefangen', { kind: 'start', jelly: 'Cooking', at: '14:55' }],
  ['fertig', { kind: 'stop', at: '15:10' }],
  ['Feierabend vor 5 Minuten', { kind: 'stop', at: '15:05' }],
  ['heute morgen 30 min gassi mit dem hund', { kind: 'place', jelly: 'Dog', minutes: 30, within: ['06:00', '12:00'] }],
  ['walked the dog 7:30-8', { kind: 'place', jelly: 'Dog', from: '07:30', to: '08:00' }],
  ['groceries for 45 minutes yesterday afternoon', { kind: 'place', jelly: 'Groceries', minutes: 45, day: 'yesterday', within: ['12:00', '18:00'] }],
  ['yesterday evening 1.5 hours on stint', { kind: 'place', jelly: 'Stint', minutes: 90, day: 'yesterday', within: ['17:00', '23:00'] }],
  ['deeep wrok since 9:30', { kind: 'start', jelly: 'Deep work', at: '09:30' }],
  ['lnuch 12-1', { kind: 'place', jelly: 'Lunch', from: '12:00', to: '13:00' }],
  ['acme website from 13:00 to 14:30', { kind: 'place', jelly: 'Website', from: '13:00', to: '14:30' }],
  ['sport yesterday 18:00 for an hour', { kind: 'place', jelly: 'Sport', from: '18:00', to: '19:00', day: 'yesterday' }],
  ['nordlicht call 11:15–11:45', { kind: 'place', jelly: 'Nordlicht', from: '11:15', to: '11:45' }],
  ['cooking now', { kind: 'start', jelly: 'Cooking', at: '15:10' }],
  ['stopped working at quarter to 3', { kind: 'stop', at: '14:45' }],
  ['meetings 9:30 to 10', { kind: 'place', jelly: 'Meetings', from: '09:30', to: '10:00' }],
  ['Nachmittags 2 Stunden am Garden Planner gearbeitet', { kind: 'place', jelly: 'Garden planner', minutes: 120, within: ['12:00', '18:00'] }],
  ['deep work 2 to 4', { kind: 'place', jelly: 'Deep work', from: '14:00', to: '15:10' }],
  ['last monday 2h garden planner', { kind: 'problem' }],
  ['dog walk tomorrow at 8', { kind: 'problem' }],
  ["what's the weather like", [{ kind: 'ignored' }, { kind: 'problem' }]],
];

let ids = 0;
const sample = sampleData(NOW, () => `id-${ids++}`, offsetAt);
const tree = buildTree(sample.contexts);
const entries = sample.entries.filter((e) => e.startUtc <= NOW);

const name = (id: string) => tree.byId.get(id as never)?.name ?? id;
const yesterday = (t: number) => (startOfDay(t) < startOfDay(NOW) ? 'yesterday ' : '');

function describePlan(plan: Plan): string {
  if (plan.kind === 'start') return `start ${name(plan.contextId)} at ${yesterday(plan.at)}${formatClock(plan.at)}`;
  if (plan.kind === 'stop') return `stop at ${formatClock(plan.at)}`;
  return `place ${name(plan.contextId)} ${yesterday(plan.from)}${formatClock(plan.from)}–${formatClock(plan.to)}`;
}

function matches(plan: Plan | null, problem: boolean, e: Expected): boolean {
  if (e.kind === 'ignored') return !plan && !problem;
  if (e.kind === 'problem') return problem;
  if (!plan || plan.kind !== e.kind) return false;
  if (plan.kind === 'stop' && e.kind === 'stop') return formatClock(plan.at) === e.at;
  if (plan.kind === 'start' && e.kind === 'start') return name(plan.contextId) === e.jelly && formatClock(plan.at) === e.at && !yesterday(plan.at);
  if (plan.kind === 'place' && e.kind === 'place') {
    return (
      name(plan.contextId) === e.jelly &&
      (e.from === undefined || formatClock(plan.from) === e.from) &&
      (e.to === undefined || formatClock(plan.to) === e.to) &&
      (e.minutes === undefined || Math.round((plan.to - plan.from) / 60_000) === e.minutes) &&
      (e.within === undefined || (formatClock(plan.from) >= e.within[0] && formatClock(plan.to) <= e.within[1])) &&
      (e.day === 'yesterday') === (startOfDay(plan.from) < startOfDay(NOW))
    );
  }
  return false;
}

const only = process.env.ONLY;
const rows: string[] = [];
let passed = 0;
let total = 0;
const latencies: number[] = [];
for (const [phrase, expected] of cases) {
  if (only && !phrase.includes(only)) continue;
  total++;
  const request = sentenceRequest(phrase, tree);
  let answerText = '';
  let latency = '';
  let reading: ReturnType<typeof readSentence> = null;
  let failure = '';
  const run = spawnSync('scripts/model.sh', { input: JSON.stringify(request), encoding: 'utf8' });
  const notes = run.stderr.split('\n').filter((l) => l && !l.includes('step-agent'));
  latency = notes.find((l) => /^\d+\.\d+s$/.test(l)) ?? '';
  if (latency) latencies.push(Number.parseFloat(latency));
  if (run.status === 0) {
    const answer = JSON.parse(run.stdout) as Parameters<typeof readSentence>[1];
    answerText = Object.entries(answer)
      .filter(([, v]) => v !== '' && v !== 'none')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    reading = readSentence(phrase, answer, { tree, entries, now: NOW });
  } else {
    failure = notes[0] ?? `exit ${run.status}`;
  }
  const plan = reading && 'plan' in reading ? reading.plan : null;
  const problem = reading !== null && 'problem' in reading;
  const ok = !failure && (Array.isArray(expected) ? expected : [expected]).some((e) => matches(plan, problem, e));
  if (ok) passed++;
  const result = failure ? `model failed: ${failure}` : plan ? describePlan(plan) : problem && reading && 'problem' in reading ? `problem: ${reading.problem}` : 'ignored';
  rows.push(`| ${phrase} | ${answerText} | ${result} | ${ok ? 'ok' : 'WRONG'} | ${latency} |`);
  console.error(`${ok ? 'ok   ' : 'WRONG'} ${phrase} → ${result}  [${answerText}]`);
}

console.log('| Phrase | Model answer | Plan | Verdict | Latency |');
console.log('| --- | --- | --- | --- | --- |');
for (const row of rows) console.log(row);
const sorted = [...latencies].sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
console.log(`\n${passed}/${total} right.${median === undefined ? '' : ` Latency median ${median.toFixed(2)} s, max ${sorted.at(-1)?.toFixed(2)} s.`}`);
