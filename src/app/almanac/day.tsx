import { useLocalSearchParams } from 'expo-router';

import { parseDayParam } from '@/directions/almanac/dates';
import { DayPage } from '@/directions/almanac/DayPage';

/** The Day: `?date=2026-09-24`, today when absent. */
export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  return <DayPage day={parseDayParam(date)} />;
}
