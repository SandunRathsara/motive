import { plural } from './workouts.format';
import type { SessionTemplate, SetEntry, WorkoutSession } from './workouts.schemas';
import type { Loadable } from './workouts.view-models';

/** Today's Start/Resume card (TODAY-1). Pure. */

export interface TodayTrainingContent {
  action: 'start' | 'resume' | 'none';
  templateId: string | null;
  templateName: string | null;
  sessionId: string | null;
  /** "Start" or "Resume". */
  buttonLabel: string;
  /** "Full Body" */
  title: string;
  /** "Next in your rotation" or "9 sets logged". */
  detail: string;
  /** "Start Full Body" / "Resume Full Body". */
  accessibilityLabel: string;
}

export type TodayTrainingViewModel = Loadable<TodayTrainingContent>;

export function buildTodayTraining(input: {
  active: (WorkoutSession & { sets: readonly SetEntry[] }) | null; next: SessionTemplate | null;
}): TodayTrainingContent {
  if (input.active) {
    const name = input.active.prescription.templateName;
    const working = input.active.sets.filter((set) => set.type === 'working').length;
    return {
      action: 'resume', templateId: input.active.templateId, templateName: name, sessionId: input.active.id,
      buttonLabel: 'Resume', title: name, detail: working === 0 ? 'In progress' : `${plural(working, 'set')} logged`,
      accessibilityLabel: `Resume ${name}`,
    };
  }
  if (input.next) {
    return {
      action: 'start', templateId: input.next.id, templateName: input.next.name, sessionId: null,
      buttonLabel: 'Start', title: input.next.name, detail: 'Next in your rotation', accessibilityLabel: `Start ${input.next.name}`,
    };
  }
  return {
    action: 'none', templateId: null, templateName: null, sessionId: null,
    buttonLabel: 'Start', title: 'No Session Templates', detail: 'Add a Session Template in your Training Program', accessibilityLabel: 'No Session Templates',
  };
}
