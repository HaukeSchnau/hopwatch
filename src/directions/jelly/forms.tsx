// Scaffolding for Jelly's SwiftUI forms (settings, the jelly editor, entry detail): a
// native navigation bar with toolbar buttons over an inset grouped form on the page's
// cream or night background, and a candy header row that hosts React Native content.

import {
  Button,
  Form,
  Group,
  Host,
  NavigationStack,
  RNHostView,
  Section,
  Toolbar,
  ToolbarItem,
} from '@expo/ui/swift-ui';
import { background, disabled, listRowBackground, listRowInsets, navigationTitle, scrollContentBackground } from '@expo/ui/swift-ui/modifiers';
import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';

import { useTheme } from './theme';

/** Horizontal margin of an inset grouped section on iPhone. */
const SECTION_MARGIN = 16;

interface JellyFormProps {
  title: string;
  /** Tint for native controls: the jelly's candy color. */
  tint?: string;
  /** The leading toolbar action; Close when omitted. */
  cancel?: { label: string; onPress: () => void } | null;
  /** The trailing toolbar action, e.g. Done or Add. */
  confirm?: { label: string; onPress: () => void; disabled?: boolean };
  children: ReactNode;
}

export function JellyForm({ title, tint, cancel, confirm, children }: JellyFormProps) {
  const t = useTheme();
  return (
    <Host style={{ flex: 1 }} colorScheme={t.scheme} seedColor={tint ?? t.c.pinkDeep}>
      <NavigationStack>
        <Toolbar>
          <Form modifiers={[navigationTitle(title), scrollContentBackground('hidden'), background(t.c.bg)]}>{children}</Form>
          <Toolbar.Content>
            {cancel === null ? null : (
              <ToolbarItem placement="cancellationAction">
                {cancel ? <Button label={cancel.label} onPress={cancel.onPress} /> : <Button role="close" onPress={() => router.back()} />}
              </ToolbarItem>
            )}
            {confirm ? (
              <ToolbarItem placement="confirmationAction">
                <Button label={confirm.label} systemImage="checkmark" onPress={confirm.onPress} modifiers={[disabled(confirm.disabled ?? false)]} />
              </ToolbarItem>
            ) : null}
          </Toolbar.Content>
        </Toolbar>
      </NavigationStack>
    </Host>
  );
}

/**
 * A full-bleed form row for React Native content, e.g. the candy header with a live
 * jelly. `render` gets the row's width, since the hosted view sizes itself.
 */
export function HostedRow({ color, render }: { color?: string; render: (width: number) => ReactElement }) {
  const { width } = useWindowDimensions();
  return (
    <Section>
      <Group modifiers={[listRowInsets({ top: 0, bottom: 0, leading: 0, trailing: 0 }), ...(color ? [listRowBackground(color)] : [])]}>
        <RNHostView matchContents>{render(width - SECTION_MARGIN * 2)}</RNHostView>
      </Group>
    </Section>
  );
}
