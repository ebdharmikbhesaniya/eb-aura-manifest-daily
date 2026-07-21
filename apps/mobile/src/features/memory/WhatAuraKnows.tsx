import { useEffect } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';

import { memoryCopy } from '@/copy/memory';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import type { MemoryItem } from './api';
import { useDeleteMemoryItem, useMemoryItems } from './hooks';

/**
 * "What Aura Knows" (09 §6, product 10 §43) — the transparency screen.
 *
 * Reads `memory_items` directly via RLS; no backend endpoint exists or is needed.
 *
 * TWO RULES THAT LOOK LIKE STYLING BUT ARE PRODUCT REQUIREMENTS:
 *
 * 1. **Every item renders identically.** A sensitive item gets no badge, no lock
 *    icon, no muted styling. Marking her struggle as special on the one screen
 *    she reviews it would stigmatize the thing she was bravest to tell us. The
 *    tier does its work invisibly, in what generation may spend (09 §2).
 * 2. **Plain language only.** The `content` column is already a sentence; this
 *    screen never shows a category, tier, weight or id. If it reads like a
 *    database row, it reads like surveillance.
 *
 * Layout is deliberately spare; everything it does render comes from the
 * design tokens. The behaviour and the copy are what matter here and are tested.
 */
export function WhatAuraKnows() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);
  const { data: items, isLoading } = useMemoryItems(userId ?? undefined);
  const deleteItem = useDeleteMemoryItem(userId ?? undefined);

  useEffect(() => {
    analytics.capture('what_aura_knows_viewed');
  }, []);

  const confirmDelete = (item: MemoryItem) => {
    Alert.alert(
      memoryCopy.whatAuraKnows.deleteConfirmTitle,
      memoryCopy.whatAuraKnows.deleteConfirmBody,
      [
        { text: memoryCopy.whatAuraKnows.deleteConfirmCancel, style: 'cancel' },
        {
          text: memoryCopy.whatAuraKnows.deleteConfirmAccept,
          style: 'destructive',
          onPress: () => deleteItem.mutate({ id: item.id, category: item.category }),
        },
      ],
    );
  };

  const container = { flex: 1, padding: spacing.lg, gap: spacing.md } as const;

  if (isLoading) return <View testID="what-aura-knows-loading" style={container} />;

  return (
    <View style={container}>
      <Text style={[typography.title, { color: colors.text.primary }]}>
        {memoryCopy.whatAuraKnows.title}
      </Text>
      <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
        {memoryCopy.whatAuraKnows.contract}
      </Text>

      <FlatList
        testID="memory-list"
        data={items ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.text.secondary }]}>
            {memoryCopy.whatAuraKnows.empty}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            {/* `content` only — never category, tier or weight. */}
            <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>
              {item.content}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${memoryCopy.whatAuraKnows.deleteAction}: ${item.content}`}
              onPress={() => confirmDelete(item)}
            >
              <Text style={[typography.bodySmall, { color: colors.text.destructive }]}>
                {memoryCopy.whatAuraKnows.deleteAction}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}
