import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input, PillButton, TextButton } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

export interface EditFieldSheetProps {
  open: boolean;
  title: string;
  initialValue: string;
  multiline?: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}

/**
 * The edit sheet for profile fields (product 11: sheets for input). On save it
 * shows the memory contract — "I'll write differently from now on" — because an
 * edit that silently vanishes reads as not being heard (product 10 §44).
 *
 * Plain Modal for the same reason as the edit-guard: a simple single-input
 * sheet doesn't need detent machinery, and it keeps this testable everywhere.
 */
export function EditFieldSheet({
  open,
  title,
  initialValue,
  multiline = false,
  onSave,
  onClose,
}: EditFieldSheetProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-opening for a different field must not show the previous field's text.
  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setSaved(false);
    }
  }, [open, initialValue]);

  // The close timer must die with the sheet, not fire into an unmounted world.
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const save = () => {
    onSave(value);
    setSaved(true);
    // Let the contract line land before the sheet leaves.
    closeTimer.current = setTimeout(onClose, 1200);
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      {/*
        This is a plain RN Modal, not a `Sheet`, so it gets none of the
        bottom-sheet library's keyboard handling. The panel is anchored to the
        bottom and the field below autofocuses, so without this the keyboard
        opens straight over the thing she was asked to edit — the same
        edge-to-edge failure the gate and the conversation had.
      */}
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <Pressable
          accessibilityLabel={profileCopy.edit.cancel}
          onPress={onClose}
          style={{ flex: 1, backgroundColor: colors.surface.scrim, justifyContent: 'flex-end' }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: colors.surface.sheet,
              borderTopLeftRadius: radii.sheet,
              borderTopRightRadius: radii.sheet,
              paddingTop: spacing.lg,
              paddingHorizontal: spacing.lg,
              // Clear the home indicator / nav bar so the save button isn't cut.
              paddingBottom: spacing.lg + insets.bottom,
              gap: spacing.md,
            }}
          >
            <Text style={[typography.title, { color: colors.text.primary }]}>{title}</Text>

            {saved ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[typography.body, { color: colors.text.secondary }]}
              >
                {profileCopy.edit.savedNote}
              </Text>
            ) : (
              <View style={{ gap: spacing.md }}>
                <Input value={value} onChangeText={setValue} multiline={multiline} autoFocus />
                <PillButton title={profileCopy.edit.save} onPress={save} />
                <TextButton title={profileCopy.edit.cancel} onPress={onClose} />
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
