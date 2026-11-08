import { useRouter } from 'expo-router';
import { OnboardingTemplate } from '@/components/templates/OnboardingTemplate';
import { useOnboarding } from '@/features/onboarding';

export default function OnboardingRoute() {
  const router = useRouter();
  const model = useOnboarding(() => router.replace('/'));
  return <OnboardingTemplate model={model} />;
}
