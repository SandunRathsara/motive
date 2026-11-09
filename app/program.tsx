import { useRouter } from 'expo-router';
import { ProgramEditorTemplate } from '@/components/templates/ProgramEditorTemplate';
import { defaultRestSeconds, programDraftTools, useProgramEditor } from '@/features/workouts';

export default function ProgramEditorRoute() {
  const router = useRouter();
  const editor = useProgramEditor();
  return <ProgramEditorTemplate model={editor.model} defaultRestSeconds={defaultRestSeconds} tools={programDraftTools}
    validate={editor.validate} saving={editor.saving} errorText={editor.errorText} onSave={editor.save}
    onSaved={() => router.back()} />;
}
