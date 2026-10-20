// The public API the UI builds on. Read with the hooks, write with `actions`, format
// with the time helpers. Nothing in src/jelly talks to SQLite, notifications or the
// timeline module directly.

export { markBreak, setEveningCheck, useEveningCheck } from './evening';
export * from './hooks';
export { parseCommand, type RemoteCommand, type Snapshot, snapshotOf, tapCommand } from './remote';
export { type LinkAction, parseLink, resumeLink, startLink, stopLink } from './links';
export {
  type ConnectResult,
  connectSlack,
  disconnectSlack,
  type SlackLink,
  syncSlack,
  useSlackAvailable,
  useSlackLink,
} from './slack-link';
export type { SlackLine } from './tree';
export * from './model';
export { type GermanState, germanStates, type HolidayId } from './holidays';
export { isJobHours } from './workdays';
export {
  type DayReport,
  formatTargetLine,
  type OvertimeBalance,
  type Fragmentation,
  type GapSegment,
  type Segment,
  type TargetLine,
  type Totals,
  type TotalsNode,
  totalsText,
  type WeekReport,
} from './reports';
export {
  actions,
  connectRemoteQueue,
  type ContextPatch,
  drainRemote,
  type Intent,
  type Json,
  type LastAction,
  newContextId,
  type HopwatchState,
  useHopwatch,
} from './store';
export * from './time';
export {
  blockInside,
  type EntryPatch,
  findOpen,
  type Gap,
  type PlacePreview,
  previewPlace,
  previousContextId,
  previewStart,
  type StartPreview,
} from './timeline';
export { type Plan, type Reading, readSentence, type SentenceAnswer, sentenceRequest } from './sentence';
export { type ContextTree, pathLabel, type ResolvedContext, subtreeIds } from './tree';
export type { Backup, ParseResult } from './backup';
export { LAST_EXPORT, pickBackup, shareExport } from './export';
export { requestNudgePermission } from './permissions';
export { eraseAllData, loadSampleData } from './sample-loader';
export { checkSummary, summaryRequest, weekFacts, type WeekFacts } from './week-facts';
