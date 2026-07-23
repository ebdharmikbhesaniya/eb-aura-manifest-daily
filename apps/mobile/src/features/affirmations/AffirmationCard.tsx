import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, Label } from '@/components';
import { affirmationsCopy } from '@/copy/affirmations';
import { useTheme } from '@/theme/ThemeProvider';
import { clampedFontScale, scaledType } from '@/theme/typography';

export interface AffirmationCardProps {
  text: string;
  technique?: keyof typeof affirmationsCopy.techniques | null;
  /** The goal area this one grew out of — v4's "From your words" chip. */
  sourceWord?: string | null;
  /** "July 22" — computed by the screen so the card stays a pure layout. */
  dateLabel?: string;
  /** Hidden until she reveals it — the small ceremony product 09 §9.3a asks for. */
  revealed: boolean;
  /** Drives the heart's fill; `saved_at` on the row behind it. */
  favorited?: boolean;
  /**
   * True only while the share image is being captured.
   *
   * The actions live ON the card in v4, and `captureShareCard` photographs this
   * exact view — so without this the exported image would carry two buttons.
   * Hiding them for the capture keeps ONE layout rather than a second one that
   * drifts (product 09 §9.3 share-as-image).
   */
  capturing?: boolean;
  onReveal?: () => void;
  onTechnique?: () => void;
  onFavorite?: () => void;
  /** Reads the line aloud. Absent leaves the button inert but in place. */
  onHear?: (() => void) | undefined;
  /** True while the device voice is reading, so the button offers to stop. */
  hearing?: boolean;
  onShare?: () => void;
  testID?: string;
}

/**
 * The affirmation card (product 09 §9.3a, v4 §affirmations).
 *
 * Parchment is the affirmation colour and nothing else's. The layout is v4's:
 * date and keep mark, the line itself, two annotation chips, then the paired
 * actions. The why-line moved off the card into the technique sheet the first
 * chip opens, which is where an explanation belongs.
 *
 * Reveal is a deliberate beat, not a loading state: the card exists, and she
 * chooses when to read it. That tiny act of consent is what separates "here is
 * your content" from "here is something meant for you".
 *
 * `forwardRef` so the share renderer can capture exactly this view rather than
 * rebuilding a second, drifting layout.
 */
export const AffirmationCard = forwardRef<View, AffirmationCardProps>(function AffirmationCard(
  {
    text,
    technique,
    sourceWord,
    dateLabel,
    revealed,
    favorited = false,
    capturing = false,
    onReveal,
    onTechnique,
    onFavorite,
    onHear,
    hearing = false,
    onShare,
    testID,
  },
  ref,
) {
  const { colors, layout, radii, spacing } = useTheme();
  const scale = clampedFontScale();

  const surface = {
    backgroundColor: colors.accent.parchment,
    borderRadius: radii.card,
    paddingVertical: layout.affirmationCardPaddingV,
    paddingHorizontal: layout.cardPadding,
  };

  // "TODAY · JULY 22" and the keep mark — the v4 card header, on both states.
  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <Label>
        {dateLabel ? `${affirmationsCopy.todayLabel} · ${dateLabel}` : affirmationsCopy.todayLabel}
      </Label>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorited ? affirmationsCopy.kept : affirmationsCopy.keep}
        accessibilityState={{ selected: favorited }}
        hitSlop={12}
        onPress={onFavorite}
        testID="affirmation-favorite"
      >
        <Text
          allowFontScaling={false}
          style={[
            scaledType('body', scale),
            { color: favorited ? colors.accent.heart : colors.text.disabled },
          ]}
        >
          {favorited ? '♥' : '♡'}
        </Text>
      </Pressable>
    </View>
  );

  if (!revealed) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={affirmationsCopy.reveal}
        onPress={onReveal}
        testID={testID ? `${testID}-reveal` : 'affirmation-reveal'}
      >
        <Card variant="solid" style={surface}>
          {header}
          <Text
            allowFontScaling={false}
            style={[
              scaledType('body', scale),
              { marginTop: spacing.lg, color: colors.text.secondary, textAlign: 'center' },
            ]}
          >
            {affirmationsCopy.reveal}
          </Text>
        </Card>
      </Pressable>
    );
  }

  // v4 ends the line with an ember-deep period — the brand mark applied to the
  // sentence she actually reads, not to a heading.
  const trimmed = text.trimEnd();
  const endsInStop = /[.!?]$/.test(trimmed);
  const body = endsInStop ? trimmed.slice(0, -1) : trimmed;
  const stop = endsInStop ? trimmed.slice(-1) : '.';

  const chip = (key: string, label: string, onPress?: () => void) => (
    <Pressable
      key={key}
      accessibilityRole={onPress ? 'button' : 'text'}
      onPress={onPress}
      disabled={!onPress}
      testID={onPress ? 'affirmation-technique' : 'affirmation-source'}
      style={{
        paddingVertical: spacing.sm - 1,
        paddingHorizontal: spacing.md,
        borderRadius: radii.pill,
        backgroundColor: colors.surface.cardGlassy,
      }}
    >
      <Text
        allowFontScaling={false}
        style={[scaledType('cardChip', scale), { color: colors.text.secondary }]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View ref={ref} collapsable={false} testID={testID}>
      <Card variant="solid" style={surface}>
        {header}

        <Text
          allowFontScaling={false}
          style={[
            scaledType('affirmationHero', scale),
            { marginTop: spacing.md + 2, color: colors.text.primary },
          ]}
        >
          {body}
          <Text style={{ color: colors.accent.emberDeep }}>{stop}</Text>
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
            marginTop: spacing.lg - 4,
          }}
        >
          {/* The technique chip is the education wedge (product 09 §9.3c) — it
              opens the explanation rather than decorating the card. */}
          {technique &&
            chip('technique', affirmationsCopy.techniques[technique].label, onTechnique)}
          {sourceWord &&
            chip('source', affirmationsCopy.fromYourWords.replace('{word}', sourceWord))}
        </View>

        {!capturing && (
          <View style={{ flexDirection: 'row', gap: spacing.md - 2, marginTop: spacing.lg - 4 }}>
            <CardAction
              title={hearing ? affirmationsCopy.hearStop : affirmationsCopy.hear}
              onPress={onHear}
              testID="affirmation-hear"
            />
            <CardAction
              title={affirmationsCopy.share}
              onPress={onShare}
              outline
              testID="affirmation-share"
            />
          </View>
        )}
      </Card>
    </View>
  );
});

/**
 * One of v4's paired card actions: ink fill or ink outline, 44pt.
 *
 * A missing handler renders it inert rather than dropping it — the pair is the
 * layout, and one stretched button is a different card.
 */
function CardAction({
  title,
  onPress,
  outline = false,
  testID,
}: {
  title: string;
  onPress?: (() => void) | undefined;
  outline?: boolean;
  testID?: string;
}) {
  const { colors, layout, radii } = useTheme();
  const scale = clampedFontScale();
  const inert = !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert }}
      disabled={inert}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          flex: 1,
          height: layout.cardButtonHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.pill,
        },
        outline
          ? { borderWidth: 1.5, borderColor: colors.cta.background }
          : { backgroundColor: colors.cta.background },
        inert && { opacity: 0.4 },
        pressed && !inert && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text
        allowFontScaling={false}
        style={[
          scaledType('cardButton', scale),
          { color: outline ? colors.text.primary : colors.text.onCta },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
