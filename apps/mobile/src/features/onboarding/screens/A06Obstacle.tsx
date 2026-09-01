import type { Ionicons } from '@expo/vector-icons';

import { onboardingCopy, type ObstacleKey } from '@/copy/onboarding';

import { ChoiceScreen } from '../ChoiceScreen';

const OBSTACLE_ICON: Record<ObstacleKey, keyof typeof Ionicons.glyphMap> = {
  forget: 'time-outline',
  motivation: 'leaf-outline',
  selfdoubt: 'help-outline',
  busy: 'timer-outline',
};

/**
 * Q6 — obstacle. Configures mechanics, not content. Stored as the LABEL: it
 * lands in `profiles.struggle`, which the Letter reads as her own words.
 */
export function A06Obstacle() {
  const c = onboardingCopy.a06Obstacle;

  return (
    <ChoiceScreen
      testID="a06-obstacle"
      screenId="a06-obstacle"
      question={c.question}
      options={c.choices.map((choice) => ({
        key: choice.key,
        label: choice.label,
        value: choice.label,
        icon: OBSTACLE_ICON[choice.key],
      }))}
    />
  );
}
