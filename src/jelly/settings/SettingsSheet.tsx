// Settings as a native form under a candy header: the idea next to a mascot, squishy
// sounds, the Apple Intelligence status, Shortcuts links, export, restore and erasing, and
// links to help and the privacy policy.
// Android: SettingsSheet.android.tsx.

import { Button, DatePicker, Section, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { environment, foregroundStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { type Availability, availability } from '@modules/on-device-model';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { resumeLink, stopLink } from '@/core';
import { settingsText } from '@/i18n/settings';

import { setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useTheme } from '../theme';
import { pickerLocale } from '../sheets/parts';
import { Idea, openPage, useEveningSetting, useSettingsActions } from './parts';

/** System red, so erasing never reads like the pink actions around it. */
const DANGER = '#FF3B30';
const { evening, intelligence, shortcuts, data, about } = settingsText;

export function SettingsSheet() {
  const t = useTheme();
  const sounds = useSounds();
  const { contexts, entries, copied, copy, erase, restore, exportData } = useSettingsActions();
  const check = useEveningSetting();

  return (
    <JellyForm title={settingsText.title} cancel={null} confirm={{ label: settingsText.done, onPress: () => router.back() }}>
      <HostedRow color={t.candy.pink.tint} render={(width) => <Idea width={width} />} />
      <Section title={settingsText.sound}>
        <Toggle label={settingsText.sounds} systemImage="speaker.wave.2" isOn={sounds} onIsOnChange={setSounds} />
      </Section>
      <Section title={evening.title} footer={<SwiftText>{evening.footer}</SwiftText>}>
        <Toggle label={evening.toggle} systemImage="moon.stars" isOn={check.on} onIsOnChange={check.toggle} />
        {check.on ? (
          <DatePicker
            title={evening.at}
            selection={check.at}
            displayedComponents={['hourAndMinute']}
            onDateChange={check.setAt}
            modifiers={[environment('locale', pickerLocale)]}
          />
        ) : null}
      </Section>
      <AppleIntelligence />
      <Section title={shortcuts.title} footer={<SwiftText>{shortcuts.footer}</SwiftText>}>
        <Button label={copied === stopLink ? shortcuts.copiedStop : shortcuts.copyStop} systemImage="stop.circle" onPress={() => copy(stopLink)} />
        <Button label={copied === resumeLink ? shortcuts.copiedResume : shortcuts.copyResume} systemImage="play.circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title={data.title} footer={<SwiftText>{data.footer(contexts, entries)}</SwiftText>}>
        <Button label={data.export} systemImage="square.and.arrow.up" onPress={exportData} />
        <Button label={data.restore} systemImage="square.and.arrow.down" onPress={restore} />
        <Button
          role="destructive"
          modifiers={[tint(DANGER), foregroundStyle(DANGER)]}
          label={data.erase}
          systemImage="trash"
          onPress={erase}
        />
      </Section>
      <Section>
        <Button label={about.help} systemImage="questionmark.circle" onPress={() => openPage(about.helpUrl)} />
        <Button label={about.privacy} systemImage="hand.raised" onPress={() => openPage(about.privacyUrl)} />
      </Section>
    </JellyForm>
  );
}

/** Whether the on-device model is ready, and if not, what to do about it. */
function AppleIntelligence() {
  const [state, setState] = useState<Availability | null>(null);

  useEffect(() => {
    let live = true;
    availability()
      .catch((): Availability => 'unsupported')
      .then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, []);

  return (
    <Section title="Apple Intelligence" footer={<SwiftText>{intelligence.footer}</SwiftText>}>
      <SwiftText>{state ? intelligence.status[state] : intelligence.checking}</SwiftText>
    </Section>
  );
}
