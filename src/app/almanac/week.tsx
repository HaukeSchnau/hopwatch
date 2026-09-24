import { useLocalSearchParams } from 'expo-router';

import { parseDayParam } from '@/directions/almanac/dates';
import { ReportPage } from '@/directions/almanac/ReportPage';

/** The Week: `?mode=week|day&date=2026-09-24`; this week when absent. */
export default function WeekRoute() {
  const { mode, date } = useLocalSearchParams<{ mode?: string; date?: string }>();
  return <ReportPage mode={mode === 'day' ? 'day' : 'week'} anchor={parseDayParam(date)} />;
}
