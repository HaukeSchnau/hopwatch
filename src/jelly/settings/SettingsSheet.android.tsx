// Settings on Android: the same candy header and rows as iOS, as Material list rows.
// Apple Intelligence doesn't exist here, so its section is left out.

import { router } from 'expo-router';

import { germanStates, resumeLink, setHolidayRegion, stopLink, useHolidayRegion } from '@/core';
import { settingsText } from '@/i18n/settings';

import { setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { PickerRow, Row, Section, sentence, SwitchRow, TimeRow } from '../material';
import { useTheme } from '../theme';
import { Idea, openPage, useEveningSetting, useSettingsActions } from './parts';

const { evening, holidays, shortcuts, data, about } = settingsText;
const NONE = 'none';

export function SettingsSheet() {
  const t = useTheme();
  const sounds = useSounds();
  const { contexts, entries, copied, copy, erase, restore, exportData } = useSettingsActions();
  const check = useEveningSetting();
  const region = useHolidayRegion();

  return (
    <JellyForm title={settingsText.title} cancel={null} confirm={{ label: settingsText.done, onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title={settingsText.sound}>
        <SwitchRow label={settingsText.sounds} icon="volume_up" value={sounds} onChange={setSounds} />
      </Section>
      <Section title={evening.title} footer={evening.footer}>
        <SwitchRow label={evening.toggle} icon="bedtime" value={check.on} onChange={check.toggle} />
        {check.on ? <TimeRow label={evening.at} value={check.at} onChange={check.setAt} /> : null}
      </Section>
      <Section title={holidays.title} footer={holidays.footer}>
        <PickerRow
          label={holidays.picker}
          icon="celebration"
          choices={[{ value: NONE, label: holidays.none }, ...germanStates.map((state) => ({ value: state, label: holidays.states[state] }))]}
          value={region ?? NONE}
          onChange={(value) => setHolidayRegion(germanStates.find((state) => state === value) ?? null)}
        />
      </Section>
      <Section title={shortcuts.title} footer={shortcuts.footer}>
        <Row label={sentence(copied === stopLink ? shortcuts.copiedStop : shortcuts.copyStop)} icon="stop_circle" onPress={() => copy(stopLink)} />
        <Row label={sentence(copied === resumeLink ? shortcuts.copiedResume : shortcuts.copyResume)} icon="play_circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title={data.title} footer={data.footer(contexts, entries)}>
        <Row label={sentence(data.export)} icon="file_export" onPress={exportData} />
        <Row label={sentence(data.restore)} icon="settings_backup_restore" onPress={restore} />
        <Row label={sentence(data.erase)} icon="delete_forever" destructive onPress={erase} />
      </Section>
      <Section>
        <Row label={about.help} icon="help" onPress={() => openPage(about.helpUrl)} />
        <Row label={sentence(about.privacy)} icon="privacy_tip" onPress={() => openPage(about.privacyUrl)} />
      </Section>
    </JellyForm>
  );
}
