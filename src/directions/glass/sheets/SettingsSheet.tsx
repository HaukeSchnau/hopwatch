import { Button, Form, Host, NavigationStack, Section, Text, Toolbar, ToolbarItem } from '@expo/ui/swift-ui';
import { navigationTitle } from '@expo/ui/swift-ui/modifiers';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { eraseAllData, loadSampleData, resumeLink, shareExport, stopLink, useStint } from '@/core';

import { useTheme } from '../theme';

/** Settings: the Lab, export, sample data, erase, and the Shortcuts links. */
export function SettingsSheet() {
  const theme = useTheme();
  const contexts = useStint((s) => s.contexts.length);
  const entries = useStint((s) => s.entries.length);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (link: string) => {
    Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(link);
  };

  const confirm = (title: string, message: string, label: string, run: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () => {
          run();
          router.back();
        },
      },
    ]);

  return (
    <Host style={{ flex: 1 }} colorScheme={theme.scheme}>
      <NavigationStack>
        <Toolbar>
          <Form modifiers={[navigationTitle('Settings')]}>
            <Section title="Glass" footer={<Text>Stint as Apple would ship it: Liquid Glass and system controls, in a room that takes on the color of whatever you are doing.</Text>}>
              <Button
                label="Open the Lab"
                systemImage="flask"
                onPress={() => {
                  router.back();
                  router.push('/lab');
                }}
              />
            </Section>
            <Section title="Data" footer={<Text>{`${contexts} contexts and ${entries} entries, stored on this iPhone.`}</Text>}>
              <Button label="Export JSON" systemImage="square.and.arrow.up" onPress={() => shareExport()} />
              <Button
                label="Load Sample Data"
                systemImage="wand.and.stars"
                onPress={() => confirm('Load sample data?', 'This replaces all contexts and entries with three weeks of made-up data.', 'Replace', loadSampleData)}
              />
              <Button
                role="destructive"
                label="Erase All Data"
                systemImage="trash"
                onPress={() => confirm('Erase all data?', 'Every context and entry on this iPhone will be deleted. Export first if you want a backup.', 'Erase', eraseAllData)}
              />
            </Section>
            <Section title="Shortcuts" footer={<Text>Open these from the Shortcuts app, the Action Button or an automation. Each context has its own start link in its settings.</Text>}>
              <Button label={copied === stopLink ? 'Copied Stop Link' : 'Copy Stop Link'} systemImage="stop.circle" onPress={() => copy(stopLink)} />
              <Button label={copied === resumeLink ? 'Copied Resume Link' : 'Copy Resume Link'} systemImage="play.circle" onPress={() => copy(resumeLink)} />
            </Section>
          </Form>
          <Toolbar.Content>
            <ToolbarItem placement="confirmationAction">
              <Button label="Done" systemImage="checkmark" onPress={() => router.back()} />
            </ToolbarItem>
          </Toolbar.Content>
        </Toolbar>
      </NavigationStack>
    </Host>
  );
}
