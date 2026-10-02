// The public API the UI builds on. Read with the hooks, write with `actions`, format
// with the time helpers. Nothing in src/jelly talks to SQLite, notifications or the
// timeline module directly.

export * from './hooks';
export { type LinkAction, parseLink, resumeLink, startLink, stopLink } from './links';
export * from './model';
export {
  type DayReport,
  formatTargetLine,
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
  type ContextPatch,
  type Intent,
  type Json,
  type LastAction,
  newContextId,
  type StintState,
  useStint,
} from './store';
export * from './time';
export { type EntryPatch, findOpen, type Gap, type PlacePreview, previewPlace, previousContextId, previewStart, type StartPreview } from './timeline';
export { type Plan, type Reading, readSentence, type SentenceAnswer, sentenceRequest } from './sentence';
export { type ContextTree, pathLabel, type ResolvedContext, subtreeIds } from './tree';
export type { Backup, ParseResult } from './backup';
export { pickBackup, shareExport } from './export';
export { requestNudgePermission } from './permissions';
export { eraseAllData, loadSampleData } from './sample-loader';
export { checkSummary, summaryRequest, weekFacts, type WeekFacts } from './week-facts';
