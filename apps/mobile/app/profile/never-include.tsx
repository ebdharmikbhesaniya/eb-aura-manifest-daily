import { useRouter } from 'expo-router';

import { NeverIncludeScreen } from '@/features/memory/NeverIncludeScreen';

/** Push route from Profile (06 §1). */
export default function NeverIncludeRoute() {
  const router = useRouter();

  return <NeverIncludeScreen onBack={() => router.back()} />;
}
