import {
  BottomSheetBackdrop,
  BottomSheetModal,
  useBottomSheetSpringConfigs,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, type ReactNode } from 'react';

import { EASE, sheetSpring, useMotion } from '@/theme/motion';
import { useTheme } from '@/theme/ThemeProvider';

/** 40% dim behind the sheet (product 12 §bottom sheets). */
const BACKDROP_OPACITY = 0.4;

/** Medium/large detents (product 12 §bottom sheets) — every input flow lives here. */
const DETENTS = ['50%', '90%'] as const;

export interface SheetProps {
  children: ReactNode;
  /** Defaults to the medium/large detents; override only with a product reason. */
  snapPoints?: (string | number)[];
  /**
   * Size the sheet to its content instead of a detent (product 12 allows this
   * for a SHORT settings/confirm sheet — a fixed detent leaves dead white space
   * under a few rows). Ignored when `snapPoints` is passed.
   */
  fitContent?: boolean;
  onDismiss?: () => void;
}

/**
 * The design-system bottom sheet (product 12 §bottom sheets, 06 §2): native
 * detents, grabber, 40% dim, spring presentation. Every input flow — Manifest
 * Anything, Refine, guided affirmations — lives in one of these, so the sheet
 * IS the app's "temporary task" language.
 *
 * Present imperatively via the ref (`ref.current?.present()`); requires
 * `BottomSheetModalProvider` at the app root. Callers own the content — pass
 * `BottomSheetView`/`BottomSheetScrollView` as needed.
 */
export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function Sheet(
  { children, snapPoints, fitContent = false, onDismiss },
  ref,
) {
  // Content-fit: hand no detents and let dynamic sizing measure the content.
  // Otherwise, the caller's detents or the medium/large default.
  const resolvedSnapPoints = fitContent ? undefined : (snapPoints ?? [...DETENTS]);
  const { colors, durations, radii } = useTheme();
  const motion = useMotion();

  // Springs are reserved for sheets — the one place they read as "temporary
  // task" rather than bounce (product 13).
  const spring = useBottomSheetSpringConfigs(sheetSpring);
  // Under Reduce Motion the sheet still has to travel (position can't
  // crossfade), so only the spring's liveliness goes: a plain eased slide.
  const reducedTiming = useBottomSheetTimingConfigs({
    duration: durations.fadeRise,
    easing: EASE,
  });

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={BACKDROP_OPACITY}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      // Omitted entirely when content-fit (exactOptionalPropertyTypes forbids an
      // explicit `undefined`); otherwise the caller's detents or the default.
      {...(resolvedSnapPoints ? { snapPoints: resolvedSnapPoints } : {})}
      // Detents are fixed medium/large per product 12 by default; a short sheet
      // may opt into content-driven sizing via `fitContent` to shed dead space.
      enableDynamicSizing={fitContent}
      animationConfigs={motion.reduceMotion ? reducedTiming : spring}
      // Every input flow in the app lives in one of these (product 12), so the
      // keyboard contract belongs here rather than in each caller.
      //
      // `interactive` lets the sheet ride the keyboard instead of being covered
      // by it, and `restore` drops it back to its detent when the field blurs.
      //
      // `android_keyboardInputMode` defaults to `adjustPan`, which pans the whole
      // window and hides the sheet's own header and buttons. `adjustResize` is
      // also what this app needs specifically: it sets `edgeToEdgeEnabled=true`,
      // and the panning default is what left text fields sitting under the
      // keyboard on the gate and in the conversation.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.surface.sheet,
        borderTopLeftRadius: radii.sheet,
        borderTopRightRadius: radii.sheet,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.surface.border }}
      {...(onDismiss ? { onDismiss } : {})}
    >
      {children}
    </BottomSheetModal>
  );
});
