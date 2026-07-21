import type { Update } from '@aura/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, Label, Screen, SerifDisplay, TextButton, TAB_BAR_CLEARANCE } from '@/components';
import { profileCopy } from '@/copy/profile';
import { profileKeys, useProfile } from '@/hooks/useProfile';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import { deactivatePerson, fetchPeople, saveFreeTextNote, updateProfileField } from './api';
import { EditFieldSheet } from './EditFieldSheet';

interface EditableField {
  key: 'name' | 'self_description' | 'dream_city' | 'dream_home' | 'note';
  title: string;
  multiline?: boolean;
}

/**
 * Profile — the trust center and memory front door (product 11). Everything
 * here answers one question: "what does Aura think is true about me, and how
 * do I change it?" Edits go through sheets; saves state the memory contract.
 *
 * The layout follows Home (product 12 §spacing): section label ABOVE its card,
 * never inside it. Sharing one uppercase treatment between "BASICS" and "YOUR
 * NAME" flattened the page into a wall of same-weight text — the label belongs
 * to the group, the field belongs to the card. Whitespace does the rest: it is
 * the premium signal the design system asks for, so sections breathe at
 * `sectionGap` and every row is tappable with a chevron that says so.
 */
export function ProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, layout, spacing, typography } = useTheme();
  const userId = useAppState((s) => s.userId);

  const { data: profile } = useProfile(userId ?? undefined);
  const { data: people } = useQuery({
    queryKey: ['people', userId],
    queryFn: () => fetchPeople(userId as string),
    enabled: Boolean(userId),
  });

  const [editing, setEditing] = useState<EditableField | null>(null);

  const fieldValue = (key: EditableField['key']): string => {
    if (!profile) return '';
    if (key === 'note') return profile.free_text_note ?? '';
    return (profile[key] as string | null) ?? '';
  };

  const save = async (value: string) => {
    if (!userId || !editing) return;

    if (editing.key === 'note') await saveFreeTextNote(userId, value);
    else await updateProfileField(userId, editing.key as keyof Update<'profiles'>, value);

    await queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
  };

  const removePerson = async (personId: string) => {
    await deactivatePerson(personId);
    await queryClient.invalidateQueries({ queryKey: ['people', userId] });
  };

  const name = (profile?.name ?? '').trim();

  const hairline = { height: StyleSheet.hairlineWidth, backgroundColor: colors.surface.border };

  const row = (field: EditableField) => {
    const value = fieldValue(field.key);

    return (
      <Pressable
        key={field.key}
        accessibilityRole="button"
        accessibilityLabel={field.title}
        onPress={() => setEditing(field)}
        // Same acknowledgment language as the rest of the app, in the one form a
        // full-width row can carry: it dims under the finger (product 13).
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Label>{field.title}</Label>
          <Text
            style={[
              typography.body,
              // An unfilled field is an invitation, not data — it recedes to
              // secondary so the filled answers carry the page.
              { color: value ? colors.text.primary : colors.text.secondary },
            ]}
          >
            {value || profileCopy.edit.empty}
          </Text>
        </View>

        <Chevron />
      </Pressable>
    );
  };

  /** Rows sit flush inside the card; the hairline is what separates them. */
  const rows = (fields: EditableField[]) =>
    fields.map((field, index) => (
      <View key={field.key}>
        {index > 0 && <View style={hairline} />}
        {row(field)}
      </View>
    ));

  return (
    <Screen testID="profile-tab">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: spacing.xl,
          // The tab bar floats over this screen — without the clearance the last
          // card ends up underneath it.
          paddingBottom: TAB_BAR_CLEARANCE,
          gap: layout.sectionGap,
        }}
      >
        {/* Identity first. Without it the page opened straight into labelled
            rows and read as Settings — but this is the trust centre, and the
            person it describes should be at the top of it. The monogram is the
            whole avatar: no photo is asked for anywhere in the product, and
            inventing an upload here would be a new data request (product 18). */}
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          {/* The name is edited HERE rather than from a row in Basics. It only
              belongs in one place, and repeating it as both the page's title
              and a labelled field was the page telling her the same thing
              twice. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profileCopy.fields.name}
            onPress={() => setEditing({ key: 'name', title: profileCopy.fields.name })}
            style={({ pressed }) => ({
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Monogram name={name} />
            {name ? (
              <SerifDisplay variant="title">{name}</SerifDisplay>
            ) : (
              <Text style={[typography.body, { color: colors.text.secondary }]}>
                {profileCopy.edit.empty}
              </Text>
            )}
          </Pressable>

          <Text
            style={[typography.bodySmall, { color: colors.text.secondary, textAlign: 'center' }]}
          >
            {profileCopy.tagline}
          </Text>
        </View>

        <Section label={profileCopy.sections.basics}>
          {rows([
            {
              key: 'self_description',
              title: profileCopy.fields.selfDescription,
              multiline: true,
            },
          ])}
        </Section>

        <Section label={profileCopy.sections.dream}>
          {rows([
            { key: 'dream_city', title: profileCopy.fields.dreamCity },
            { key: 'dream_home', title: profileCopy.fields.dreamHome },
          ])}
        </Section>

        <Section label={profileCopy.sections.people}>
          {(people ?? []).length === 0 ? (
            <View style={{ paddingVertical: spacing.md }}>
              <Text style={[typography.body, { color: colors.text.secondary }]}>
                {profileCopy.people.empty}
              </Text>
            </View>
          ) : (
            (people ?? []).map((person, index) => (
              <View key={person.id}>
                {index > 0 && <View style={hairline} />}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                  }}
                >
                  {/* "Ivy — safe" stays one line: the name and its one word are
                      a single phrase in the product's voice, not two fields. */}
                  <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>
                    {person.name}
                    {person.descriptor ? ` — ${person.descriptor}` : ''}
                  </Text>
                  <TextButton
                    title={profileCopy.people.remove}
                    onPress={() => void removePerson(person.id)}
                  />
                </View>
              </View>
            ))
          )}
        </Section>

        <Section label={profileCopy.sections.note}>
          {rows([{ key: 'note', title: profileCopy.fields.note, multiline: true }])}
        </Section>

        {/* The transparency entries earn a card of their own: they are the trust
            centre's front door (product 11), not a footer. */}
        <Card variant="solid">
          <LinkRow
            title={profileCopy.links.whatAuraKnows}
            onPress={() => router.push('/profile/what-aura-knows' as never)}
          />
          <View style={hairline} />
          <LinkRow
            title={profileCopy.links.neverInclude}
            onPress={() => router.push('/profile/never-include' as never)}
          />
        </Card>
      </ScrollView>

      <EditFieldSheet
        open={editing !== null}
        title={editing?.title ?? ''}
        initialValue={editing ? fieldValue(editing.key) : ''}
        multiline={editing?.multiline ?? false}
        onSave={(value) => void save(value)}
        onClose={() => setEditing(null)}
      />
    </Screen>
  );
}

/** Diameter sits on the 8pt grid and stays clear of the serif name below it. */
const MONOGRAM_SIZE = 88;

/**
 * Her initial, set in the same serif the name uses — the page's one ornament.
 *
 * Sand on the gradient rather than periwinkle: the accent is reserved for the
 * active tab and CTAs (product 12 §color), and a full periwinkle disc at the
 * top of a quiet page would outshout everything under it.
 */
function Monogram({ name }: { name: string }) {
  const { colors, typography } = useTheme();
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      // The letter is decoration — the name is right below it in real text, so
      // a screen reader announcing "R" first would only repeat it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: MONOGRAM_SIZE,
        height: MONOGRAM_SIZE,
        borderRadius: MONOGRAM_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface.card,
        borderWidth: 1,
        borderColor: colors.surface.border,
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: typography.title.fontFamily,
          fontSize: 36,
          lineHeight: 44,
          color: colors.text.primary,
        }}
      >
        {initial}
      </Text>
    </View>
  );
}

/** Label above, card below — the grouping Home already established. */
function Section({ label, children }: { label: string; children: ReactNode }) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{label}</Label>
      <Card variant="solid">{children}</Card>
    </View>
  );
}

function LinkRow({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>{title}</Text>
      <Chevron />
    </Pressable>
  );
}

/**
 * The one affordance saying "this opens". No icon set ships at V1 (product 12
 * §icons), so the glyph stands in — hidden from screen readers, which already
 * hear the row's button role.
 */
function Chevron() {
  const { colors, typography } = useTheme();

  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[typography.body, { color: colors.text.secondary }]}
    >
      ›
    </Text>
  );
}
