import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { actions } from '@/core';

import { ContextRows, SearchField, useFilteredContexts } from '../ContextList';
import { GlassButton } from '../Glass';
import { SheetHeader } from '../SheetHeader';
import { useTheme } from '../theme';

/**
 * "All contexts": the whole tree with search, one tap from Now. Tapping a row starts
 * it; long-press backdates.
 */
export function PickSheet() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const contexts = useFilteredContexts(query);
  return (
    <View style={styles.screen}>
      <SheetHeader
        title="All Contexts"
        right={
          <GlassButton
            symbol="plus"
            label="New context"
            onPress={() => router.push({ pathname: '/glass/context/[id]', params: { id: 'new' } })}
          />
        }>
        <View style={styles.search}>
          <SearchField value={query} onChange={setQuery} />
        </View>
      </SheetHeader>
      <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        <ContextRows
          contexts={contexts}
          flat={query.trim().length > 0}
          withMenu
          onPick={(context) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            actions.start(context.id);
            router.back();
          }}
        />
        {contexts.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondary }]}>No contexts match “{query.trim()}”.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: { paddingHorizontal: 16 },
  list: { paddingBottom: 40 },
  empty: { textAlign: 'center', fontSize: 15, marginTop: 32 },
});
