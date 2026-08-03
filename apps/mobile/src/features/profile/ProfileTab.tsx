import type { Update } from '@aura/shared';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import { Screen, useTabBarClearance } from '@/components';
import { paywallCopy } from '@/copy/paywall';
import { profileCopy } from '@/copy/profile';
import { useAccountStatus } from '@/features/auth/useAccountStatus';
import { ClaimSheet } from '@/features/paywall/ClaimSheet';
import { useEntitlement } from '@/features/paywall/useEntitlement';
import { profileKeys, useProfile } from '@/hooks/useProfile';
import { useAppState } from '@/stores/appState';
import { useTheme } from '@/theme/ThemeProvider';

import { deactivatePerson, fetchPeople, saveFreeTextNote, updateProfileField } from './api';
import { EditFieldSheet } from './EditFieldSheet';
import { ProfileAccountSection } from './ProfileAccountSection';
import { ProfileHeader } from './ProfileHeader';
import { ProfileMemoryRows, type EditableField } from './ProfileMemoryRows';
import { ProfilePeopleSheet } from './ProfilePeopleSheet';
import { ProfileTrustLinks } from './ProfileTrustLinks';

/**
 * Profile — the trust center and memory front door (product 11, v4 §profile).
 * Everything here answers one question: "what does Aura think is true about
 * me, and how do I change it?"
 *
 * V4 trades the monogram-centric page for content density: grouped rows whose
 * subtitles show the REAL data behind each door. Edits still go through
 * sheets, and saves still state the memory contract. This file only wires
 * data to sections — the layout lives in the sibling section components.
 */
export function ProfileTab() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { spacing } = useTheme();
  const tabBarClearance = useTabBarClearance();
  const userId = useAppState((s) => s.userId);

  const { data: profile } = useProfile(userId ?? undefined);
  const { data: people } = useQuery({
    queryKey: ['people', userId],
    queryFn: () => fetchPeople(userId as string),
    enabled: Boolean(userId),
  });

  const [editing, setEditing] = useState<EditableField | null>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);

  // Control-center wiring (spec §5) — reuses the exact hooks/flows Settings uses.
  const { premium, inTrial } = useEntitlement();
  const { claimed, appleAvailable } = useAccountStatus();
  const claimRef = useRef<BottomSheetModal>(null);

  const planLabel = premium
    ? inTrial
      ? profileCopy.account.plan.trial
      : profileCopy.account.plan.premium
    : profileCopy.account.plan.free;
  const planTint: 'accent' | 'neutral' = premium ? 'accent' : 'neutral';

  const subscriptionSubtitle = premium
    ? inTrial
      ? paywallCopy.subscription.trial
      : paywallCopy.subscription.premium
    : paywallCopy.subscription.free;

  const openSubscription = () => router.push('/settings/subscription' as never);

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

  return (
    <Screen testID="profile-tab">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: spacing.xl,
          // The tab bar floats over this screen — without the clearance the last
          // card ends up underneath it.
          paddingBottom: tabBarClearance,
          gap: spacing.md,
        }}
      >
        <ProfileHeader
          name={name}
          onEditName={() => setEditing({ key: 'name', title: profileCopy.fields.name })}
          onOpenSettings={() => router.push('/settings' as never)}
          planLabel={planLabel}
          planTint={planTint}
          onPressPlan={openSubscription}
        />

        <ProfileAccountSection
          subscriptionSubtitle={subscriptionSubtitle}
          showClaim={claimed === false}
          onManage={openSubscription}
          onSecure={() => claimRef.current?.present()}
        />

        <ProfileMemoryRows
          fieldValue={fieldValue}
          people={people ?? []}
          onEdit={setEditing}
          onOpenPeople={() => setPeopleOpen(true)}
        />

        <ProfileTrustLinks />
      </ScrollView>

      <EditFieldSheet
        open={editing !== null}
        title={editing?.title ?? ''}
        initialValue={editing ? fieldValue(editing.key) : ''}
        multiline={editing?.multiline ?? false}
        onSave={(value) => void save(value)}
        onClose={() => setEditing(null)}
      />

      <ProfilePeopleSheet
        open={peopleOpen}
        people={people ?? []}
        onRemove={(id) => void removePerson(id)}
        onClose={() => setPeopleOpen(false)}
      />

      <ClaimSheet
        ref={claimRef}
        appleAvailable={appleAvailable}
        onDone={() => claimRef.current?.dismiss()}
      />
    </Screen>
  );
}
