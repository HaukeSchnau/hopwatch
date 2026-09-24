import {
  Button,
  ContextMenu,
  DisclosureGroup,
  Host,
  HStack,
  Image,
  List,
  Section,
  Spacer,
  SwipeActions,
  Text,
  Toggle,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  listRowBackground,
  listRowSeparator,
  listStyle,
  scrollContentBackground,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  actions,
  type ContextId,
  formatDuration,
  MINUTE,
  type ResolvedContext,
  useRunning,
  useTree,
} from '@/core';

import { Ambient } from '../Ambient';
import { GlassButton } from '../Glass';
import { useTheme } from '../theme';

const secondary = foregroundStyle({ type: 'hierarchical', style: 'secondary' });

const edit = (id: ContextId) => router.push({ pathname: '/glass/context/[id]', params: { id } });
const addChild = (parent?: ContextId) =>
  router.push({ pathname: '/glass/context/[id]', params: parent ? { id: 'new', parent } : { id: 'new' } });

/**
 * The Contexts tab: the whole tree as a native inset-grouped list with disclosure.
 * Tap a row to start it, ⓘ to edit, swipe to pin or archive, long-press for more.
 * Archived contexts hide behind a toggle.
 */
export function ContextsScreen() {
  const theme = useTheme();
  const tree = useTree();
  const insets = useSafeAreaInsets();
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState<ReadonlySet<ContextId>>(() => new Set(tree.roots));
  const archivedCount = tree.ordered.filter((c) => c.archivedAt !== null).length;
  const visible = (c: ResolvedContext) => showArchived || !c.hidden;
  const roots = tree.roots.map((id) => tree.byId.get(id)).filter((c): c is ResolvedContext => !!c && visible(c));

  const setExpanded = (id: ContextId, expanded: boolean) => {
    const next = new Set(open);
    if (expanded) next.add(id);
    else next.delete(id);
    setOpen(next);
  };

  const node = (context: ResolvedContext) => {
    const children = context.childIds
      .map((id) => tree.byId.get(id))
      .filter((c): c is ResolvedContext => !!c && visible(c));
    if (children.length === 0) return <Row key={context.id} context={context} />;
    return (
      <DisclosureGroup key={context.id} isExpanded={open.has(context.id)} onIsExpandedChange={(e) => setExpanded(context.id, e)}>
        <DisclosureGroup.Label>
          <Row context={context} />
        </DisclosureGroup.Label>
        {children.map(node)}
      </DisclosureGroup>
    );
  };

  return (
    <View style={styles.screen}>
      <Ambient still />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerText}>
          <RNText style={[styles.kicker, { color: theme.secondary }]}>{`${tree.ordered.filter((c) => !c.hidden).length} ACTIVE`}</RNText>
          <RNText style={[styles.title, { color: theme.label }]}>Contexts</RNText>
        </View>
        <GlassButton symbol="plus" label="New context" onPress={() => addChild()} />
        <GlassButton symbol="gearshape" label="Settings" onPress={() => router.push('/glass/settings')} />
      </View>
      <Host style={styles.list} colorScheme={theme.scheme}>
        <List modifiers={[listStyle('insetGrouped'), scrollContentBackground('hidden')]}>
          <Section footer={<Text>Tap to start. Swipe to pin or archive. Hold for backdating and more.</Text>}>
            {roots.map(node)}
          </Section>
          {archivedCount > 0 ? (
            <Section>
              <Toggle label={`Show Archived (${archivedCount})`} systemImage="archivebox" isOn={showArchived} onIsOnChange={setShowArchived} />
            </Section>
          ) : null}
          {/* Clearance for the tab bar and mini player, which the hosted list doesn't know about. */}
          <Section>
            <Spacer modifiers={[frame({ height: 120 }), listRowBackground('transparent'), listRowSeparator('hidden')]} />
          </Section>
        </List>
      </Host>
    </View>
  );
}

/** One context: badge, name, what it's set up with, and an ⓘ that opens the editor. */
function Row({ context }: { context: ResolvedContext }) {
  const theme = useTheme();
  const running = useRunning();
  const hue = theme.hue(context.hue);
  const isRunning = running?.context.id === context.id;
  const details = [
    context.weeklyTargetMinutes ? `${formatDuration(context.weeklyTargetMinutes * MINUTE)} a week` : null,
    context.nudgeAfterMinutes ? `remind after ${formatDuration(context.nudgeAfterMinutes * MINUTE)}` : null,
    context.archivedAt ? 'archived' : null,
  ].filter(Boolean);

  const start = () => {
    if (context.hidden) return edit(context.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    actions.start(context.id);
  };

  const row = (
    <HStack spacing={12}>
      <Button onPress={start} modifiers={[buttonStyle('plain')]}>
        <HStack spacing={12} modifiers={[contentShape(shapes.rectangle())]}>
          <ZStack modifiers={[frame({ width: 34, height: 34 }), background(hue.soft, shapes.circle())]}>
            <Text modifiers={[font({ size: 18 })]}>{context.glyph ?? '•'}</Text>
          </ZStack>
          <VStack alignment="leading" spacing={1}>
            <Text modifiers={[font({ textStyle: 'body' }), lineLimit(1), ...(context.hidden ? [secondary] : [])]}>{context.name}</Text>
            {details.length ? <Text modifiers={[font({ textStyle: 'caption' }), secondary, lineLimit(1)]}>{details.join(' · ')}</Text> : null}
          </VStack>
          <Spacer />
          {isRunning ? <Image systemName="waveform" size={15} color={hue.ink} /> : null}
          {context.pinPosition !== null ? <Image systemName="pin.fill" size={12} color={theme.hue('orange').solid} /> : null}
        </HStack>
      </Button>
      <Button onPress={() => edit(context.id)} modifiers={[buttonStyle('borderless')]}>
        <Image systemName="info.circle" size={20} color={theme.accent} />
      </Button>
    </HStack>
  );

  return (
    <ContextMenu>
      <ContextMenu.Trigger>
        <SwipeActions>
          {row}
          <SwipeActions.Actions edge="leading">
            {context.hidden ? null : (
              <Button
                label={context.pinPosition === null ? 'Pin' : 'Unpin'}
                systemImage={context.pinPosition === null ? 'pin' : 'pin.slash'}
                onPress={() => (context.pinPosition === null ? actions.pin(context.id) : actions.unpin(context.id))}
                modifiers={[tint(theme.hue('orange').solid)]}
              />
            )}
          </SwipeActions.Actions>
          <SwipeActions.Actions edge="trailing">
            <Button
              label={context.archivedAt ? 'Unarchive' : 'Archive'}
              systemImage={context.archivedAt ? 'tray.and.arrow.up' : 'archivebox'}
              onPress={() => (context.archivedAt ? actions.unarchive(context.id) : actions.archive(context.id))}
              modifiers={[tint(theme.hue('indigo').solid)]}
            />
            <Button label="Edit" systemImage="pencil" onPress={() => edit(context.id)} modifiers={[tint(theme.hue('gray').solid)]} />
          </SwipeActions.Actions>
        </SwipeActions>
      </ContextMenu.Trigger>
      <ContextMenu.Items>
        {context.hidden ? null : (
          <Section title="Start">
            <Button label="Start Now" systemImage="play.fill" onPress={start} />
            {[5, 15, 30].map((m) => (
              <Button
                key={m}
                label={`Started ${m} min ago`}
                systemImage="clock.arrow.circlepath"
                onPress={() => actions.start(context.id, { at: Date.now() - m * MINUTE })}
              />
            ))}
            <Button
              label="At a Time…"
              systemImage="clock"
              onPress={() => router.push({ pathname: '/glass/backdate', params: { mode: 'start', context: context.id } })}
            />
          </Section>
        )}
        <Button label="Edit" systemImage="pencil" onPress={() => edit(context.id)} />
        <Button label="New Context Inside" systemImage="plus" onPress={() => addChild(context.id)} />
        {context.hidden ? null : (
          <Button
            label={context.pinPosition === null ? 'Pin to Now' : 'Unpin'}
            systemImage={context.pinPosition === null ? 'pin' : 'pin.slash'}
            onPress={() => (context.pinPosition === null ? actions.pin(context.id) : actions.unpin(context.id))}
          />
        )}
        <Button
          label={context.archivedAt ? 'Unarchive' : 'Archive'}
          systemImage={context.archivedAt ? 'tray.and.arrow.up' : 'archivebox'}
          onPress={() => (context.archivedAt ? actions.unarchive(context.id) : actions.archive(context.id))}
        />
      </ContextMenu.Items>
    </ContextMenu>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, paddingBottom: 4 },
  headerText: { flex: 1 },
  kicker: { fontSize: 13, fontWeight: '600', letterSpacing: 0.1 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: 0.4 },
  list: { flex: 1 },
});
