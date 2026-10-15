// Settings as a native form under a candy header: the idea next to a mascot, squishy
// sounds, the evening check, public holidays, Slack, the Apple Intelligence status,
// Shortcuts links, export, restore and erasing, and links to help and the privacy policy.
// Android: SettingsSheet.android.tsx.

import { Button, DatePicker, LabeledContent, Picker, Section, Text as SwiftText, Toggle } from '@expo/ui/swift-ui';
import { environment, foregroundStyle, pickerStyle, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { type Availability, availability } from '@modules/on-device-model';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { germanStates, resumeLink, setHolidayRegion, stopLink, useHolidayRegion } from '@/core';
import { settingsText } from '@/i18n/settings';

import { setSounds, useSounds } from '../feedback';
import { HostedRow, JellyForm } from '../forms';
import { useTheme } from '../theme';
import { pickerLocale } from '../sheets/parts';
import { Idea, openPage, useEveningSetting, useSettingsActions, useSlackSetting } from './parts';

/** System red, so erasing never reads like the pink actions around it. */
const DANGER = '#FF3B30';
const { evening, holidays, slack, intelligence, shortcuts, data, about } = settingsText;
const NONE = 'none';

export function SettingsSheet() {
  const t = useTheme();
  const sounds = useSounds();
  const { contexts, entries, lastExport, copied, copy, erase, restore, exportData } = useSettingsActions();
  const check = useEveningSetting();
  const region = useHolidayRegion();

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
      <Section title={holidays.title} footer={<SwiftText>{holidays.footer}</SwiftText>}>
        <Picker
          label={holidays.picker}
          selection={region ?? NONE}
          onSelectionChange={(value: string) => setHolidayRegion(germanStates.find((state) => state === value) ?? null)}
          modifiers={[pickerStyle('menu')]}>
          <SwiftText modifiers={[tag(NONE)]}>{holidays.none}</SwiftText>
          {germanStates.map((state) => (
            <SwiftText key={state} modifiers={[tag(state)]}>
              {holidays.states[state]}
            </SwiftText>
          ))}
        </Picker>
      </Section>
      <Slack />
      <AppleIntelligence />
      <Section title={shortcuts.title} footer={<SwiftText>{shortcuts.footer}</SwiftText>}>
        <Button label={copied === stopLink ? shortcuts.copiedStop : shortcuts.copyStop} systemImage="stop.circle" onPress={() => copy(stopLink)} />
        <Button label={copied === resumeLink ? shortcuts.copiedResume : shortcuts.copyResume} systemImage="play.circle" onPress={() => copy(resumeLink)} />
      </Section>
      <Section title={data.title} footer={<SwiftText>{data.footer(contexts, entries, lastExport)}</SwiftText>}>
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

/** Connecting Slack, so jellies can set a status while they run. */
function Slack() {
  const { available, link, busy, connect, disconnect } = useSlackSetting();
  if (!available) return null;
  return (
    <Section title={slack.title} footer={<SwiftText>{link?.broken ? slack.broken : link ? slack.connectedFooter : slack.footer}</SwiftText>}>
      {link ? (
        <>
          <LabeledContent label={slack.workspace}>
            <SwiftText>{link.team}</SwiftText>
          </LabeledContent>
          {link.broken ? <Button label={busy ? slack.connecting : slack.reconnect} systemImage="arrow.clockwise" onPress={connect} /> : null}
          <Button role="destructive" label={slack.disconnect} systemImage="xmark.circle" onPress={disconnect} />
        </>
      ) : (
        <Button label={busy ? slack.connecting : slack.connect} systemImage="link" onPress={connect} />
      )}
    </Section>
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
