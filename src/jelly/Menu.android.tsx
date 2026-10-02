// Jelly's long-press menus on Android: a Material dropdown menu that drops from whatever
// was held, with the same header, groups and subtitles as the iOS context menu ("15 min
// ago · 14:50" over "Deep work stops at 14:50"). The hold is a gesture-handler long press,
// so it cancels the held tile's own tap when the menu opens.

import { HorizontalDivider } from '@expo/ui/jetpack-compose';
import { Fragment, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { buzz } from './feedback';
import { Dropdown, MenuLabel, MenuRow } from './material';
import type { MenuEntry, MenuItem, MenuProps } from './Menu';
import { menuSymbols } from './menuSymbols';
import { preloadSymbolImages } from './ui';

preloadSymbolImages(Object.values(menuSymbols));

export function Menu({ title, items, onPress, children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const hold = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(400)
        .runOnJS(true)
        .onStart(() => {
          buzz.thud();
          setOpen(true);
        }),
    [],
  );
  const pick = (id: string) => {
    setOpen(false);
    onPress(id);
  };
  return (
    <GestureDetector gesture={hold}>
      <View collapsable={false}>
        {children}
        <Dropdown open={open} onClose={() => setOpen(false)}>
          {title ? <MenuLabel label={title} strong /> : null}
          {groups(items).map((group, i) => (
            <Fragment key={group.title ?? `group-${i}`}>
              {i > 0 || title ? <HorizontalDivider /> : null}
              {group.title ? <MenuLabel label={group.title} /> : null}
              {group.items.map((item) => (
                <MenuRow
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.image ? menuSymbols[item.image] : undefined}
                  destructive={item.destructive}
                  onPress={() => pick(item.id)}
                />
              ))}
            </Fragment>
          ))}
        </Dropdown>
      </View>
    </GestureDetector>
  );
}

/** Sections stay groups under their header; items between sections form untitled groups. */
function groups(entries: MenuEntry[]): { title?: string; items: MenuItem[] }[] {
  const result: { title?: string; items: MenuItem[] }[] = [];
  for (const entry of entries) {
    const last = result.at(-1);
    if ('items' in entry) result.push({ title: entry.title, items: entry.items });
    else if (last && !last.title) last.items.push(entry);
    else result.push({ items: [entry] });
  }
  return result;
}
