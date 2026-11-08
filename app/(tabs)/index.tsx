import { useRouter } from 'expo-router';
import { PlaceholderTemplate } from '@/components/templates/PlaceholderTemplate';
export default function TodayRoute() {
  const router = useRouter();
  return <PlaceholderTemplate title="Today" message="Your daily overview is coming next. There’s nothing you need to do here yet."
    onOpenSettings={() => router.push('/settings')} />;
}
