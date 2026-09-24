import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  actions,
  type ContextId,
  DEFAULT_NUDGE_MINUTES,
  formatDuration,
  type Hue,
  MINUTE,
  pathLabel,
  type ResolvedContext,
  startLink,
  subtreeIds,
  useTree,
} from '@/core';

import { Print } from '../Body';
import { CapLegend } from '../CapLegend';
import { ContextList } from '../ContextList';
import { success, warning } from '../feedback';
import { GlyphPicker, HuePicker, NameField, suggestGlyph } from '../fields';
import { Triangle } from '../Glyphs';
import { Key } from '../Key';
import { Lcd, LcdText } from '../Lcd';
import { Led } from '../Led';
import { Section } from '../Section';
import { Sheet } from '../sheet';
import { Stepper } from '../Stepper';
import { body, capColor, capDark, capNeutral, lcd } from '../theme';

const keyLabel = (slot: number) => `K${String(slot + 1).padStart(2, '0')}`;
const NUDGE_STEP = 15;

/**
 * The "program" screen for one context: name, color, glyph, parent, key, weekly target,
 * nudge threshold, deep link, archive and delete. `id: 'new'` creates one, optionally
 * under `parent` or on key `slot`.
 */
export function ProgramSheet() {
  const params = useLocalSearchParams<{ id: string; parent?: string; slot?: string }>();
  const tree = useTree();
  const existing = tree.ordered.find((c) => c.id === params.id) ?? null;
  if (params.id === 'new') return <CreateContext parentParam={params.parent} slotParam={params.slot} />;
  if (!existing) return null;
  return <EditContext key={existing.id} context={existing} />;
}

function CreateContext({ parentParam, slotParam }: { parentParam?: string; slotParam?: string }) {
  const tree = useTree();
  const parent = tree.ordered.find((c) => c.id === parentParam) ?? null;
  const slot = slotParam === undefined ? null : Number(slotParam);
  const [name, setName] = useState('');
  const [hue, setHue] = useState<Hue | null>(parent ? null : 'blue');
  // Until a glyph is picked, one is suggested from the name; children inherit otherwise.
  const [picked, setPicked] = useState<{ glyph: string | null } | null>(null);
  const glyph = picked ? picked.glyph : parent ? null : suggestGlyph(name);
  const [pinned, setPinned] = useState(slot !== null || !parent);
  const shownHue = hue ?? parent?.hue ?? 'gray';

  const create = () => {
    if (!name.trim()) {
      warning();
      return;
    }
    const id = actions.createContext({ name, parentId: parent?.id ?? null, color: hue, emoji: glyph, pinned });
    if (slot !== null) actions.movePin(id, slot);
    success();
    router.back();
  };

  return (
    <Sheet
      title={parent ? 'NEW CHILD' : 'NEW CONTEXT'}
      subtitle={parent ? `UNDER ${pathLabel(parent).toLocaleUpperCase('en-GB')}` : slot !== null ? `ON KEY ${keyLabel(slot)}` : 'AT THE TOP LEVEL'}
      footer={
        <>
          <Key color={capNeutral} height={54} style={{ flex: 1 }} onPress={() => router.back()} capStyle={styles.center}>
            <Print size={10} weight="bold" color={body.ink}>
              CANCEL
            </Print>
          </Key>
          <Key color={body.accent} height={54} heavy style={{ flex: 1.6 }} onPress={create} capStyle={styles.center}>
            <Print size={11} weight="bold" color="#FFFFFF" spacing={1.5}>
              CREATE
            </Print>
          </Key>
        </>
      }>
      <View style={styles.previewRow}>
        <View style={{ flex: 1 }}>
          <Key color={capColor[shownHue]} height={78} capStyle={styles.previewCap}>
            <CapLegend name={name.trim() || 'Name'} glyph={glyph ?? parent?.glyph ?? null} hue={shownHue} parent={parent?.name} size="large" />
          </Key>
        </View>
        <View style={styles.previewSide}>
          <Key color={capNeutral} height={40} latched={pinned} disabled={slot !== null} onPress={() => setPinned((p) => !p)} capStyle={styles.pinCap}>
            <Led on={pinned} size={6} />
            <Print size={8.5} weight="bold" color={body.ink}>
              {slot !== null ? keyLabel(slot) : 'ON A KEY'}
            </Print>
          </Key>
        </View>
      </View>
      <Section label="NAME" />
      <NameField value={name} onChange={setName} placeholder="Name" autoFocus onSubmit={create} />
      <Section label="COLOR" />
      <HuePicker value={hue} onChange={setHue} inherited={parent ? parent.hue : undefined} />
      <Section label="GLYPH" />
      <GlyphPicker value={glyph} onChange={(g) => setPicked({ glyph: g })} />
    </Sheet>
  );
}

function EditContext({ context }: { context: ResolvedContext }) {
  const tree = useTree();
  const [name, setName] = useState(context.name);
  const [moving, setMoving] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const parent = context.ancestors.at(-1) ?? null;
  const inheritedNudge = parent?.nudgeMinutes ?? DEFAULT_NUDGE_MINUTES;

  const saveName = () => {
    if (name.trim() && name.trim() !== context.name) actions.updateContext(context.id, { name });
  };
  const moveTo = (parentId: ContextId | null) => {
    actions.moveContext(context.id, parentId);
    setMoving(false);
    success();
  };
  const target = context.weeklyTargetMinutes;
  const setTarget = (minutes: number | null) => actions.updateContext(context.id, { weeklyTargetMinutes: minutes });
  const nudgeOwn = context.nudgeAfterMinutes;
  const setNudge = (minutes: number | null) => actions.updateContext(context.id, { nudgeAfterMinutes: minutes });

  const blocked = subtreeIds(tree, context.id);
  const parents = tree.ordered.filter((c) => !c.hidden);

  const remove = () => {
    Alert.alert(
      `Delete ${context.name}?`,
      'A context with entries or children is archived instead, so its history stays in the reports.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const result = actions.deleteContext(context.id);
            success();
            if (result === 'deleted') router.back();
          },
        },
      ],
    );
  };

  return (
    <Sheet
      title="PROGRAM"
      subtitle={pathLabel(context).toLocaleUpperCase('en-GB')}
      footer={
        <Key
          color={body.accent}
          height={54}
          heavy
          style={{ flex: 1 }}
          onPress={() => {
            saveName();
            success();
            router.back();
          }}
          capStyle={styles.center}>
          <Print size={11} weight="bold" color="#FFFFFF" spacing={1.5}>
            DONE
          </Print>
        </Key>
      }>
      <View style={styles.previewRow}>
        <View style={{ flex: 1 }}>
          <Key color={capColor[context.hue]} height={78} capStyle={styles.previewCap} onPress={() => (context.hidden ? undefined : actions.start(context.id))}>
            <CapLegend name={name.trim() || context.name} glyph={context.glyph} hue={context.hue} parent={parent?.name} size="large" />
          </Key>
        </View>
        <View style={styles.previewSide}>
          {context.pinPosition !== null ? (
            <>
              <Key color={capNeutral} height={40} latched onPress={() => actions.unpin(context.id)} capStyle={styles.pinCap}>
                <Led on size={6} />
                <Print size={8.5} weight="bold" color={body.ink}>
                  ON {keyLabel(context.pinPosition)}
                </Print>
              </Key>
              <View style={styles.slotKeys}>
                <Key
                  color={capNeutral}
                  height={32}
                  style={{ flex: 1 }}
                  depth={4}
                  radius={7}
                  disabled={context.pinPosition === 0}
                  onPress={() => context.pinPosition !== null && actions.movePin(context.id, context.pinPosition - 1)}
                  capStyle={styles.slotCap}>
                  <Triangle dir="left" size={6} color={body.ink} />
                  <Print size={8} weight="bold" color={body.ink}>
                    KEY
                  </Print>
                </Key>
                <Key
                  color={capNeutral}
                  height={32}
                  style={{ flex: 1 }}
                  depth={4}
                  radius={7}
                  onPress={() => context.pinPosition !== null && actions.movePin(context.id, context.pinPosition + 1)}
                  capStyle={styles.slotCap}>
                  <Print size={8} weight="bold" color={body.ink}>
                    KEY
                  </Print>
                  <Triangle dir="right" size={6} color={body.ink} />
                </Key>
              </View>
            </>
          ) : (
            <Key color={capNeutral} height={40} disabled={context.hidden} onPress={() => actions.pin(context.id)} capStyle={styles.pinCap}>
              <Led on={false} size={6} />
              <Print size={8.5} weight="bold" color={body.ink}>
                PUT ON A KEY
              </Print>
            </Key>
          )}
        </View>
      </View>

      <Section label="NAME" />
      <NameField value={name} onChange={setName} onSubmit={saveName} onBlur={saveName} />

      <Section label="COLOR" />
      <HuePicker
        value={context.color}
        onChange={(color) => actions.updateContext(context.id, { color })}
        inherited={parent ? parent.hue : undefined}
      />

      <Section label="GLYPH" />
      <GlyphPicker value={context.emoji} onChange={(emoji) => actions.updateContext(context.id, { emoji })} />

      <Section label="PARENT" />
      <View style={styles.parentRow}>
        <Lcd style={styles.parentLcd} contentStyle={styles.parentContent}>
          <LcdText size={10} numberOfLines={1}>
            {parent ? pathLabel(parent).toLocaleUpperCase('en-GB') : '/ TOP LEVEL'}
          </LcdText>
        </Lcd>
        <Key color={capDark} height={46} width={92} onPress={() => setMoving((m) => !m)} capStyle={styles.center}>
          <Print size={9} weight="bold" color="#F4F1EA">
            {moving ? 'KEEP' : 'MOVE'}
          </Print>
        </Key>
      </View>
      {moving ? (
        <Lcd style={styles.moveLcd}>
          <ScrollView nestedScrollEnabled contentContainerStyle={styles.moveList} indicatorStyle="white">
            <Key color={capNeutral} height={36} depth={4} radius={7} disabled={context.parentId === null} onPress={() => moveTo(null)} capStyle={styles.center} style={styles.rootKey}>
              <Print size={8.5} weight="bold" color={body.ink}>
                MOVE TO TOP LEVEL
              </Print>
            </Key>
            <ContextList
              contexts={parents}
              selectedId={context.parentId}
              disabled={(c) => blocked.has(c.id)}
              onPick={(c) => moveTo(c.id)}
            />
          </ScrollView>
        </Lcd>
      ) : null}
      <Key
        color={capNeutral}
        height={42}
        disabled={context.hidden}
        onPress={() => router.push({ pathname: '/deck/context/[id]', params: { id: 'new', parent: context.id } })}
        capStyle={styles.center}>
        <Print size={9} weight="bold" color={body.ink} numberOfLines={1} style={styles.childLabel}>
          + ADD A CHILD UNDER {context.name.toLocaleUpperCase('en-GB')}
        </Print>
      </Key>

      <Section label="WEEKLY TARGET" hint="COVERS THE WHOLE SUBTREE" />
      <Stepper
        value={target === null ? 'OFF' : formatDuration(target * MINUTE)}
        caption={target === null ? 'NO TARGET' : 'PER WEEK'}
        dim={target === null}
        minusDisabled={target === null}
        onMinus={() => setTarget(target !== null && target > 60 ? target - 60 : null)}
        onPlus={() => setTarget((target ?? 0) + 60)}
      />

      <Section label="NUDGE AFTER" hint="IF IT RUNS THIS LONG" />
      <Stepper
        value={formatDuration(context.nudgeMinutes * MINUTE)}
        caption={nudgeOwn === null ? (parent ? `FROM ${parent.name.toLocaleUpperCase('en-GB')}` : 'DEFAULT') : 'OWN SETTING'}
        dim={nudgeOwn === null}
        minusDisabled={context.nudgeMinutes <= NUDGE_STEP}
        onMinus={() => setNudge(Math.max(NUDGE_STEP, context.nudgeMinutes - NUDGE_STEP))}
        onPlus={() => setNudge(context.nudgeMinutes + NUDGE_STEP)}
      />
      {nudgeOwn !== null ? (
        <Key color={capNeutral} height={36} depth={4} radius={7} onPress={() => setNudge(null)} capStyle={styles.center}>
          <Print size={8.5} weight="bold" color={body.ink}>
            INHERIT AGAIN ({formatDuration(inheritedNudge * MINUTE)})
          </Print>
        </Key>
      ) : null}

      <Section label="SHORTCUT LINK" hint="FOR SHORTCUTS AND SIRI" />
      <View style={styles.parentRow}>
        <Lcd style={styles.parentLcd} contentStyle={styles.parentContent}>
          <LcdText size={8} numberOfLines={2} color={linkCopied ? lcd.hot : lcd.ink}>
            {linkCopied ? 'COPIED' : startLink(context.id)}
          </LcdText>
        </Lcd>
        <Key
          color={capDark}
          height={46}
          width={92}
          onPress={async () => {
            await Clipboard.setStringAsync(startLink(context.id));
            success();
            setLinkCopied(true);
          }}
          capStyle={styles.center}>
          <Print size={9} weight="bold" color="#F4F1EA">
            COPY
          </Print>
        </Key>
      </View>

      <Section label="LIFECYCLE" />
      <View style={styles.dangerRow}>
        <Key
          color={capNeutral}
          height={48}
          style={{ flex: 1 }}
          onPress={() => {
            if (context.archivedAt === null) actions.archive(context.id);
            else actions.unarchive(context.id);
            success();
          }}
          capStyle={styles.center}>
          <Print size={9} weight="bold" color={body.ink}>
            {context.archivedAt === null ? 'ARCHIVE' : 'UNARCHIVE'}
          </Print>
        </Key>
        <Key color={capNeutral} height={48} style={{ flex: 1 }} onPress={remove} capStyle={styles.center}>
          <Print size={9} weight="bold" color="#C8321E">
            DELETE
          </Print>
        </Key>
      </View>
      {context.archivedAt !== null ? (
        <Print size={8} color={body.ink2}>
          ARCHIVED: HIDDEN FROM KEYS AND PICKERS, STILL IN REPORTS.
        </Print>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  previewRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  previewCap: { paddingHorizontal: 12, paddingTop: 9, paddingBottom: 11 },
  previewSide: { width: 132, gap: 10, justifyContent: 'flex-start' },
  pinCap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  slotKeys: { flexDirection: 'row', gap: 8 },
  slotCap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  parentRow: { flexDirection: 'row', gap: 10 },
  parentLcd: { flex: 1, height: 46 },
  parentContent: { justifyContent: 'center', paddingHorizontal: 12 },
  moveLcd: { height: 300 },
  moveList: { paddingVertical: 8 },
  rootKey: { marginHorizontal: 10, marginBottom: 6 },
  dangerRow: { flexDirection: 'row', gap: 12 },
  childLabel: { paddingHorizontal: 14 },
});
