import { View } from 'react-native';

import { IconTile, Label, ListRow, RowGroup } from '@/components';
import { profileCopy } from '@/copy/profile';
import { useTheme } from '@/theme/ThemeProvider';

import type { Person } from './api';

export interface EditableField {
  key: 'name' | 'self_description' | 'dream_city' | 'dream_home' | 'note';
  /** Title for the edit sheet — the field's question, not the row's name. */
  title: string;
  multiline?: boolean;
}

export interface ProfileMemoryRowsProps {
  /** Current value for a field; empty string when unset. */
  fieldValue: (key: EditableField['key']) => string;
  people: Person[];
  onEdit: (field: EditableField) => void;
  onOpenPeople: () => void;
}

/** "Ivy — safe" stays one phrase: the name and its one word are a single unit. */
export function personLine(person: Person): string {
  return person.descriptor ? `${person.name} — ${person.descriptor}` : person.name;
}

/**
 * The memory front door (v4 §profile): one grouped card of rows, each showing
 * the REAL data it holds as a one-line subtitle — the page answers "what does
 * Aura think is true about me?" before a single tap. An unfilled field shows
 * the in-voice invitation instead.
 */
export function ProfileMemoryRows({
  fieldValue,
  people,
  onEdit,
  onOpenPeople,
}: ProfileMemoryRowsProps) {
  const { spacing } = useTheme();
  const snippet = (key: EditableField['key']) => fieldValue(key) || profileCopy.edit.empty;

  const peopleLine =
    people.length > 0 ? people.map(personLine).join(' · ') : profileCopy.people.empty;

  return (
    <View style={{ gap: spacing.sm }}>
      <Label>{profileCopy.account.memoryLabel}</Label>
      <RowGroup separatorInset="leading">
        <ListRow
          title={profileCopy.rows.basics}
          subtitle={snippet('self_description')}
          leading={<IconTile tint="parchment" icon="sparkles-outline" />}
          onPress={() =>
            onEdit({
              key: 'self_description',
              title: profileCopy.fields.selfDescription,
              multiline: true,
            })
          }
        />
        <ListRow
          title={profileCopy.rows.dreamCity}
          subtitle={snippet('dream_city')}
          leading={<IconTile tint="blush" icon="location-outline" />}
          onPress={() => onEdit({ key: 'dream_city', title: profileCopy.fields.dreamCity })}
        />
        <ListRow
          title={profileCopy.rows.dreamHome}
          subtitle={snippet('dream_home')}
          leading={<IconTile tint="blush" icon="home-outline" />}
          onPress={() => onEdit({ key: 'dream_home', title: profileCopy.fields.dreamHome })}
        />
        <ListRow
          title={profileCopy.rows.people}
          subtitle={peopleLine}
          leading={<IconTile tint="olive" icon="people-outline" />}
          onPress={onOpenPeople}
        />
        <ListRow
          title={profileCopy.rows.note}
          subtitle={snippet('note')}
          leading={<IconTile tint="parchment" icon="create-outline" />}
          onPress={() => onEdit({ key: 'note', title: profileCopy.fields.note, multiline: true })}
        />
      </RowGroup>
    </View>
  );
}
