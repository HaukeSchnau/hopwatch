// Settings on Android: the same candy header and rows as iOS, as Material list rows.
// Apple Intelligence doesn't exist here, so its section is left out.

import { router } from 'expo-router';

import { resumeLink, stopLink } from '@/core';
import { settingsText } from '@/i18n/settings';

import { setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { Row, Section, SwitchRow } from '../material';
import { useTheme } from '../theme';
import { Idea, openPage, useSettingsActions } from './parts';

const { shortcuts, data, about } = settingsText;

export function SettingsSheet() {
  const t = useTheme();
  const sounds = useSounds();
  const { contexts, entries, copied, copy, erase, restore, exportData } = useSettingsActions();

  return (
    <JellyForm title={settingsText.title} cancel={null} confirm={{ label: settingsText.done, onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title={settingsText.sound}>
        <SwitchRow label={settingsText.sounds} icon="volume_up" value={sounds} onChange={setSounds} />
      </Section>
      <Section title={shortcuts.title} footer={shortcuts.footer}>
        <Row label={copied === stopLink ? shortcuts.copiedStop : shortcuts.copyStop} icon="stop_circle" onPress={() => copy(stopLink)} />
        <Row label={copied === resumeLink ? shortcuts.copiedResume : shortcuts.copyResume} icon="play_circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title={data.title} footer={data.footer(contexts, entries)}>
        <Row label={data.export} icon="file_export" onPress={exportData} />
        <Row label={data.restore} icon="settings_backup_restore" onPress={restore} />
        <Row label={data.erase} icon="delete_forever" destructive onPress={erase} />
      </Section>
      <Section>
        <Row label={about.help} icon="help" onPress={() => openPage(about.helpUrl)} />
        <Row label={about.privacy} icon="privacy_tip" onPress={() => openPage(about.privacyUrl)} />
      </Section>
    </JellyForm>
  );
}
