import { useRouter } from 'expo-router';
import { TrainTemplate } from '@/components/templates/TrainTemplate';
import { useTrainingWeek } from '@/features/workouts';

export default function TrainRoute() {
  const router = useRouter();
  const week = useTrainingWeek();

  const openSession = (sessionId: string | null) => { if (sessionId) router.push({ pathname: '/session/[id]', params: { id: sessionId } }); };
  const startTemplate = async (templateId: string) => openSession(await week.startTemplate(templateId));
  const openSummary = (id: string) => router.push({ pathname: '/session/[id]/summary', params: { id } });

  return <TrainTemplate model={week.model} errorText={week.errorText}
    onStartTemplate={(templateId) => { void startTemplate(templateId); }}
    onResume={() => openSession(week.resume())} onOpenSession={openSummary} onEditProgram={() => router.push('/program')} />;
}
