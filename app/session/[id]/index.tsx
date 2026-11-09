import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActiveSessionTemplate } from '@/components/templates/ActiveSessionTemplate';
import { useActiveSession, useUndo } from '@/features/workouts';

export default function ActiveSessionRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useActiveSession(id);
  const undo = useUndo();
  const leave = () => { if (router.canGoBack()) router.back(); else router.replace('/train'); };
  return <ActiveSessionTemplate model={session.model} actions={session.actions} sheet={session.sheet} errorText={session.errorText}
    undo={{ offer: undo.offer, errorText: undo.errorText, onUndo: () => { void undo.undo(); } }}
    onFinish={() => { void session.actions.finish().then((finished) => { if (finished) router.replace({ pathname: '/session/[id]/summary', params: { id: finished } }); }); }}
    onDone={leave}
    onDeleteSession={() => { void session.actions.deleteSession().then((deleted) => { if (deleted) leave(); }); }}
    onOpenHistory={(exerciseId) => router.push({ pathname: '/history/[exerciseId]', params: { exerciseId } })} />;
}
