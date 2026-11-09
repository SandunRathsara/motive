import { useRouter } from 'expo-router';
import { TrainTemplate } from '@/components/templates/TrainTemplate';
import { useTrainingWeek } from '@/features/workouts';

export default function TrainRoute() {
  const router = useRouter();
  const week = useTrainingWeek();
  const open = (sessionId: string | null) => { if (sessionId) router.push({ pathname: '/session/[id]', params: { id: sessionId } }); };
  return <TrainTemplate model={week.model} errorText={week.errorText}
    onStartTemplate={(templateId) => { void week.startTemplate(templateId).then(open); }}
    onResume={() => open(week.resume())}
    onOpenSession={(id) => router.push({ pathname: '/session/[id]/summary', params: { id } })}
    onEditProgram={() => router.push('/program')} />;
}
