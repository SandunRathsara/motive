import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActiveSessionTemplate } from '@/components/templates/ActiveSessionTemplate';
import { useActiveSession, useUndo } from '@/features/workouts';

export default function ActiveSessionRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useActiveSession(id);
  const undo = useUndo();

  const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/train'); };
  const finish = async () => {
    const finishedId = await session.actions.finish();
    if (finishedId) router.replace({ pathname: '/session/[id]/summary', params: { id: finishedId } });
  };
  const deleteSession = async () => {
    if (await session.actions.deleteSession()) leave();
  };
  const openHistory = (exerciseId: string) => router.push({ pathname: '/history/[exerciseId]', params: { exerciseId } });

  return <ActiveSessionTemplate model={session.model} actions={session.actions} sheet={session.sheet} errorText={session.errorText}
    undo={{ offer: undo.offer, errorText: undo.errorText, onUndo: () => { void undo.undo(); } }}
    onFinish={() => { void finish(); }} onDone={leave} onDeleteSession={() => { void deleteSession(); }} onOpenHistory={openHistory} />;
}
