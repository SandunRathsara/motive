import { useLocalSearchParams, useRouter } from 'expo-router';
import { SessionSummaryTemplate } from '@/components/templates/SessionSummaryTemplate';
import { useSessionSummary, useUndo } from '@/features/workouts';

export default function SessionSummaryRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const summary = useSessionSummary(id);
  const undo = useUndo();
  // Back to the tab the session was opened from; the undo toast waits there.
  const done = () => { if (router.canGoBack()) router.dismissAll(); else router.replace('/train'); };
  return <SessionSummaryTemplate model={summary.model} errorText={summary.errorText}
    undo={{ offer: undo.offer, errorText: undo.errorText, onUndo: () => { void undo.undo(); } }}
    onDone={done}
    onEditSets={() => router.push({ pathname: '/session/[id]', params: { id } })}
    onDeleteSession={() => { void summary.deleteSession().then((deleted) => { if (deleted) done(); }); }} />;
}
