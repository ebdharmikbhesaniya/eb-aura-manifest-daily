import { Modal, Pressable, Text, View } from 'react-native';

import { TextButton } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

import type { Person } from './api';
import { personLine } from './ProfileMemoryRows';

export interface ProfilePeopleSheetProps {
  open: boolean;
  people: Person[];
  onRemove: (personId: string) => void;
  onClose: () => void;
}

/**
 * The people list behind the "Your people" row (v4 §profile). Same simple UI
 * the tab used to render inline — names with a Remove that deactivates, never
 * deletes (02 §1) — now in a sheet so the row can carry the summary line.
 *
 * Plain Modal for the same reason as EditFieldSheet: a short list needs no
 * detent machinery, and it keeps this testable everywhere.
 */
export function ProfilePeopleSheet({ open, people, onRemove, onClose }: ProfilePeopleSheetProps) {
  const { colors, radii, spacing, typography } = useTheme();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityLabel={profileCopy.people.done}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: colors.surface.scrim, justifyContent: 'flex-end' }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface.sheet,
            borderTopLeftRadius: radii.sheet,
            borderTopRightRadius: radii.sheet,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={[typography.title, { color: colors.text.primary }]}>
            {profileCopy.rows.people}
          </Text>

          {people.length === 0 ? (
            <Text style={[typography.body, { color: colors.text.secondary }]}>
              {profileCopy.people.empty}
            </Text>
          ) : (
            people.map((person) => (
              <View
                key={person.id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: spacing.md,
                }}
              >
                <Text style={[typography.body, { flex: 1, color: colors.text.primary }]}>
                  {personLine(person)}
                </Text>
                <TextButton title={profileCopy.people.remove} onPress={() => onRemove(person.id)} />
              </View>
            ))
          )}

          <TextButton title={profileCopy.people.done} onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
