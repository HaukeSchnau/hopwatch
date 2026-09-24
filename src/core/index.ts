// The public API every design direction builds on. Read with the hooks, write with
// `actions`, format with the time helpers. Nothing in src/directions talks to SQLite,
// notifications or the timeline module directly.

export * from './directions';
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
export { actions, type ContextPatch, type Intent, type LastAction, type StintState, useStint } from './store';
export * from './time';
export type { EntryPatch, Gap } from './timeline';
export { type ContextTree, pathLabel, type ResolvedContext, subtreeIds } from './tree';
export { shareExport } from './export';
export { eraseAllData, loadSampleData } from './sample-loader';
