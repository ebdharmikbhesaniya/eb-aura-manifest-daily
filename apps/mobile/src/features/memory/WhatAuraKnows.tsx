import { useEffect } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Label, SerifDisplay } from '@/components';
import { memoryCopy } from '@/copy/memory';
import { analytics } from '@/lib/analytics';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import type { MemoryItem } from './api';
import { useDeleteMemoryItem, useMemoryItems } from './hooks';

/** Section order (v4 §what-aura-knows): who she is → the dream → daily life. */
const GROUP_ORDER = Object.keys(memoryCopy.whatAuraKnows.groups) as MemoryItem['category'][];

/**
 * "What Aura Knows" (09 §6, product 10 §43) — the transparency screen, in the
 * v4 grouped layout: serif title, the contract line, then each memory as a
 * quiet bordered row under a section label in her language.
 *
 * TWO RULES THAT LOOK LIKE STYLING BUT ARE PRODUCT REQUIREMENTS:
 *
 * 1. **The words render identically for every item.** No badge, no lock icon,
 *    no muted text on a sensitive memory — marking her struggle as special on
 *    the one screen she reviews it would stigmatize the thing she was bravest
 *    to tell us. V4 gives heavy items a softer blush surface — a held tone,
 *    not a warning — and nothing else changes.
 * 2. **Plain language only.** The `content` column is already a sentence, and
 *    the section labels are her words ("What feels heavy"), never the enum's.
 *    If it reads like a database row, it reads like surveillance.
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

  const groups = GROUP_ORDER.map((category) => ({
    category,
    label: memoryCopy.whatAuraKnows.groups[category],
    items: (items ?? []).filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <View style={container}>
      <SerifDisplay variant="title">{memoryCopy.whatAuraKnows.title}</SerifDisplay>
      <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
        {memoryCopy.whatAuraKnows.contract}
      </Text>

      <ScrollView
        testID="memory-list"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}
      >
        {groups.length === 0 ? (
          <Text style={[typography.body, { color: colors.text.secondary }]}>
            {memoryCopy.whatAuraKnows.empty}
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.category} style={{ gap: spacing.sm }}>
              <Label>{group.label}</Label>
              {group.items.map((item) => (
                <MemoryRow key={item.id} item={item} onForget={confirmDelete} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* The scope of a removal, said once, where she'd look for it. */}
      <Text style={[typography.bodySmall, { color: colors.text.disabled, textAlign: 'center' }]}>
        {memoryCopy.whatAuraKnows.footer}
      </Text>
    </View>
  );
}

/** One memory: her sentence, and the quiet action that forgets it. */
function MemoryRow({ item, onForget }: { item: MemoryItem; onForget: (i: MemoryItem) => void }) {
  const { colors, radii, spacing, typography } = useTheme();

  // A held tone, not a warning — the words themselves style like every other row.
  const sensitive = item.tier === 'sensitive';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.field,
        backgroundColor: sensitive ? colors.accent.blushSoft : colors.surface.card,
        borderWidth: sensitive ? 0 : 1,
        borderColor: colors.surface.border,
      }}
    >
      {/* `content` only — never category, tier or weight. */}
      <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>{item.content}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${memoryCopy.whatAuraKnows.deleteAction}: ${item.content}`}
        onPress={() => onForget(item)}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[typography.bodySmall, { color: colors.text.secondary }]}>
          {memoryCopy.whatAuraKnows.deleteAction}
        </Text>
      </Pressable>
    </View>
  );
}
