import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import {
  Card,
  Input,
  Label,
  PillButton,
  SerifDisplay,
  TextButton,
  WeekDots,
  useTabBarClearance,
} from '@/components';
import { gratitudeCopy } from '@/copy/gratitude';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

import { dayLabelFor } from './dayLabel';

/** How long the field may sit empty before Aura offers a starter (product 09 §9.4). */
export const STARTER_DELAY_MS = 5_000;

export interface GratitudeScreenProps {
  prompt: string;
  dots: { date: string; filled: boolean }[];
  history: { entryDate: string; entry: string }[];
  /** Today's line, if she has already written one — this is an edit, not a new entry. */
  todaysEntry: string | null;
  showContract: boolean;
  onSave: (entry: string) => void;
  /** Opens the full record at `gratitude/history`. */
  onHistory?: () => void;
  testID?: string;
}

/**
 * The Gratitude tab (product 09 §9.4, v4 §gratitude).
 *
 * There is no loading state and no error state anywhere in here, deliberately:
 * the write is local and the sync is silent, so the only feedback she ever gets
 * is the dot filling and the word "Kept." An error state would turn a
 * ten-second habit into something that can fail.
 *
 * The dots carry no streak and no break state — they fill, and that is all they
 * can express (see `weekDots`).
 */
export function GratitudeScreen({
  prompt,
  dots,
  history,
  todaysEntry,
  showContract,
  onSave,
  onHistory,
  testID,
}: GratitudeScreenProps) {
  const { colors, layout, radii, spacing } = useTheme();
  const scale = clampedFontScale();
  const tabBarClearance = useTabBarClearance();

  // Seeded from today's line so a LATER visit is an edit rather than a blank
  // field over an entry that already exists. Pressing Keep clears it again —
  // see `keep` below.
  const [entry, setEntry] = useState(todaysEntry ?? '');
  const [showStarter, setShowStarter] = useState(false);

  const draft = entry.trim();
  const hasTodaysEntry = todaysEntry !== null && todaysEntry.trim() !== '';

  // The starter is an offer after a pause, not a nag: it appears once, only if
  // the field is still empty, and never re-triggers once she starts typing.
  // Suppressed once today's line exists — clearing the field on Keep would
  // otherwise restart this timer and offer her a prompt she has already answered.
  useEffect(() => {
    if (draft !== '' || hasTodaysEntry) return;
    const timer = setTimeout(() => setShowStarter(true), STARTER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, hasTodaysEntry]);

  /**
   * Kept means kept: the words leave the composer and reappear under TODAY.
   *
   * Leaving them in the field showed the same line twice — once in an editable
   * box still offering to save it, once in the list below — which reads as "it
   * didn't take". An empty composer plus "Kept." is the whole confirmation.
   */
  const keep = () => {
    onSave(draft);
    setEntry('');
    setShowStarter(false);
  };

  // Kept when today's line exists and the composer is not proposing a change —
  // either just cleared, or re-seeded with that same line on a later visit.
  const saved = hasTodaysEntry && (draft === '' || draft === todaysEntry.trim());

  // The question's final mark carries the ember, so it is split off the string
  // rather than baked into the copy — the copy stays a plain sentence.
  const trimmedPrompt = prompt.trimEnd();
  const endsInMark = /[?.!]$/.test(trimmedPrompt);
  const promptBody = endsInMark ? trimmedPrompt.slice(0, -1) : trimmedPrompt;
  const promptMark = endsInMark ? trimmedPrompt.slice(-1) : '';

  return (
    // The composer is the screen's whole job, so the keyboard is up whenever
    // she is actually using it. Under `edgeToEdgeEnabled=true` Android stops
    // applying the manifest's adjustResize, which left the field and the Save
    // button below the keyboard with no way to scroll them back into view.
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <ScrollView
        testID={testID}
        contentContainerStyle={{
          padding: layout.screenMargin,
          gap: spacing.lg,
          paddingBottom: tabBarClearance,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.md,
          }}
        >
          <SerifDisplay variant="title">{gratitudeCopy.title}</SerifDisplay>
          <View testID="gratitude-dots">
            <WeekDots filled={dots.map((dot) => dot.filled)} />
          </View>
        </View>

        <Card variant="solid" style={{ gap: spacing.md }}>
          {/* v4 sets the question a step below a sheet title and closes it on an
            ember mark — the same brand full stop the screen titles wear. */}
          <Text
            allowFontScaling={false}
            style={[scaledType('gratitudePrompt', scale), { color: colors.text.primary }]}
          >
            {promptBody}
            <Text style={{ color: colors.accent.ember }}>{promptMark}</Text>
          </Text>

          <Input
            value={entry}
            onChangeText={setEntry}
            placeholder={gratitudeCopy.placeholder}
            multiline
            sunken
            testID="gratitude-input"
          />

          {showStarter && draft === '' && !hasTodaysEntry && (
            <Text
              testID="gratitude-starter"
              allowFontScaling={false}
              style={[scaledType('bodySmall', scale), { color: colors.text.secondary }]}
            >
              {gratitudeCopy.starter}
            </Text>
          )}

          {showContract && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  // The memory-contract mark: a small blush dot, warmth not warning.
                  width: spacing.sm,
                  height: spacing.sm,
                  borderRadius: spacing.sm / 2,
                  backgroundColor: colors.accent.blush,
                }}
              />
              <Text
                testID="gratitude-contract"
                allowFontScaling={false}
                style={[scaledType('bodySmall', scale), { color: colors.text.secondary, flex: 1 }]}
              >
                {gratitudeCopy.memoryContract}
              </Text>
            </View>
          )}
        </Card>

        <PillButton
          title={saved ? gratitudeCopy.saved : gratitudeCopy.save}
          disabled={draft === '' || saved}
          onPress={keep}
          testID="gratitude-save"
        />

        <View style={{ gap: spacing.sm }}>
          <Label>{gratitudeCopy.historyMonthTitle}</Label>

          {history.length === 0 ? (
            <Card variant="solid">
              <Text
                testID="gratitude-history-empty"
                allowFontScaling={false}
                style={[scaledType('body', scale), { color: colors.text.secondary }]}
              >
                {gratitudeCopy.historyEmpty}
              </Text>
            </Card>
          ) : (
            history.map((item) => (
              <Card
                key={item.entryDate}
                variant="solid"
                // v4 §gratitude gives an entry its own surface: 16pt radius and
                // 13/16 padding, tighter than the composer it sits under.
                style={{
                  gap: spacing.xs - 1,
                  borderRadius: radii.field,
                  paddingVertical: layout.tilePaddingV,
                  paddingHorizontal: layout.listRowPaddingH,
                }}
              >
                {/* Plain, not the tracked uppercase `Label`: a weekday here is a
                  timestamp on her own words, not section wayfinding. */}
                <Text
                  allowFontScaling={false}
                  style={[scaledType('entryDay', scale), { color: colors.text.label }]}
                >
                  {dayLabelFor(item.entryDate)}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[scaledType('entryBody', scale), { color: colors.text.body }]}
                >
                  {item.entry}
                </Text>
              </Card>
            ))
          )}
        </View>

        {history.length > 0 && onHistory && (
          <TextButton
            title={gratitudeCopy.allEntries}
            onPress={onHistory}
            testID="gratitude-all-entries"
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
