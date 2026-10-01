// Jelly's native long-press menus, on SwiftUI's context menu. Like @expo/ui's community
// MenuView (iOS), plus a subtitle under an item, which iOS shows as smaller gray text:
// "15 min ago · 14:50" over "Deep work stops at 14:50".
// TODO: go back to MenuView from @expo/ui/community/menu once its actions take a subtitle.

import { Button, type ButtonProps, ContextMenu, Host, Image, RNHostView, Section, Text } from '@expo/ui/swift-ui';
import type { ReactNode } from 'react';

export interface MenuItem {
  id: string;
  title: string;
  subtitle?: string;
  /** An SF Symbol. */
  image?: ButtonProps['systemImage'];
  destructive?: boolean;
}

/** Items shown inline under a small header. */
export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export type MenuEntry = MenuItem | MenuSection;

interface MenuProps {
  /** The small header over all items, e.g. the jelly's name. */
  title?: string;
  items: MenuEntry[];
  onPress: (id: string) => void;
  /** Long-pressing this opens the menu. */
  children: ReactNode;
}

export function Menu({ title, items, onPress, children }: MenuProps) {
  const rendered = items.map((entry) =>
    'items' in entry ? (
      <Section key={entry.title} title={entry.title}>
        {entry.items.map((item) => (
          <Item key={item.id} item={item} onPress={onPress} />
        ))}
      </Section>
    ) : (
      <Item key={entry.id} item={entry} onPress={onPress} />
    ),
  );
  return (
    <Host matchContents ignoreSafeArea="all">
      <ContextMenu>
        <ContextMenu.Trigger>
          <RNHostView matchContents>
            <>{children}</>
          </RNHostView>
        </ContextMenu.Trigger>
        <ContextMenu.Items>{title ? <Section title={title}>{rendered}</Section> : rendered}</ContextMenu.Items>
      </ContextMenu>
    </Host>
  );
}

function Item({ item, onPress }: { item: MenuItem; onPress: (id: string) => void }) {
  const role = item.destructive ? 'destructive' : undefined;
  const press = () => onPress(item.id);
  if (!item.subtitle) return <Button label={item.title} systemImage={item.image} role={role} onPress={press} />;
  // A label of image, title and subtitle: the system menu lays them out itself.
  const label = [<Text key="title">{item.title}</Text>, <Text key="subtitle">{item.subtitle}</Text>];
  return (
    <Button role={role} onPress={press}>
      {item.image ? [<Image key="image" systemName={item.image} />, ...label] : label}
    </Button>
  );
}
