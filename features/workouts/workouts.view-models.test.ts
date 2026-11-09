import type { HealthWorkout } from '@/features/health';
import { computeProgression, type ProgressionSession } from './workouts.progression';
import { progressionPrescription } from './workouts.history';
import type { SetEntry, TemplateExercise, WorkoutSession } from './workouts.schemas';
import {
  buildActiveSession, buildExerciseHistory, buildSessionSummary, buildSetSheet, buildTodayTraining, buildTrainingWeek,
  type SessionDetailInput, type SessionUiState,
} from './workouts.view-models';

const utc = () => 0;
const t0 = Date.UTC(2026, 10, 9, 10);
const squat: TemplateExercise = { id: 'sq', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 };
const pushUp: TemplateExercise = { id: 'pu', exerciseId: 'push-up', workingSets: 2, repRange: { min: 8, max: 15 }, incrementKg: 0 };
const idle: SessionUiState = { expandedExerciseId: null, drafts: {}, pending: {}, rest: null };

const session = (extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 's-now', templateId: 'full-body', startedAt: t0, endedAt: null, completed: false, deload: false,
  prescription: { templateName: 'Full Body', exercises: [squat, pushUp] }, ...extra,
});
const entry = (id: string, exercise: TemplateExercise, index: number, loadKg: number | null, reps: number, type: SetEntry['type'] = 'working'): SetEntry => ({
  id, sessionId: 's-now', templateExerciseId: exercise.id, exerciseId: exercise.exerciseId, index, type, loadKg, reps, committedAt: t0 + index, editedAt: null,
});
const history = (sets: [number | null, number][]): ProgressionSession => ({ id: 'old', sets: sets.map(([loadKg, reps]) => ({ type: 'working', loadKg, reps })) });
function detail(options: { squatHistory?: ProgressionSession[]; sets?: SetEntry[]; ended?: boolean } = {}): SessionDetailInput {
  const sets = options.sets ?? [];
  return {
    session: session(options.ended ? { endedAt: t0 + 3_600_000, completed: true } : {}),
    exercises: [squat, pushUp].map((templateExercise) => ({
      templateExercise,
      exercise: templateExercise.exerciseId === 'back-squat'
        ? { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false }
        : { id: 'push-up', name: 'Push-up', muscleGroup: 'chest', equipment: 'none', bodyweight: true },
      bodyweight: templateExercise.id === 'pu',
      progression: computeProgression(progressionPrescription(templateExercise), templateExercise.id === 'sq' ? options.squatHistory ?? [] : []),
      sets: sets.filter((set) => set.templateExerciseId === templateExercise.id),
    })),
  };
}
const card = (content: ReturnType<typeof buildActiveSession>, id: string) => content.exercises.find((item) => item.templateExerciseId === id)!;

describe('chips (S3)', () => {
  test('a Recommended Set shows load × reps with last session as secondary text and a spoken label', () => {
    const squatCard = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 7]])] }), idle), 'sq');
    expect(squatCard.chips[0]).toMatchObject({
      label: 'Set 1', kind: 'working', loadKg: 80, reps: 9, recommended: true, saveState: 'idle', needsLoad: false, setId: null,
      primaryText: '80 × 9', secondaryText: 'last 80 × 8', accessibilityLabel: '80 kilograms, 9 reps, recommended',
    });
    expect(squatCard.chips.map((chip) => chip.primaryText)).toEqual(['80 × 9', '80 × 9', '80 × 8']);
    expect(squatCard.chips[2].secondaryText).toBe('last 80 × 7');
    expect(squatCard.prescriptionText).toBe('3 × 6–10');
    expect(squatCard.progressText).toBe('0 of 3 sets');
    expect(squatCard.firstSession).toBe(false);
  });

  test('first session: reps start at the bottom of the range, no load until set, later sets copy the first load (TRN-3)', () => {
    const first = card(buildActiveSession(detail(), idle), 'sq');
    expect(first.firstSession).toBe(true);
    expect(first.chips[0]).toMatchObject({ loadKg: null, reps: 6, recommended: false, needsLoad: true, secondaryText: null, primaryText: '— × 6' });
    const afterOne = card(buildActiveSession(detail({ sets: [entry('a', squat, 0, 60, 6)] }), idle), 'sq');
    expect(afterOne.chips[0]).toMatchObject({ saveState: 'saved', setId: 'a', loadKg: 60 });
    expect(afterOne.chips[1]).toMatchObject({ loadKg: 60, reps: 6, recommended: false, needsLoad: false });
    expect(afterOne.progressText).toBe('1 of 3 sets');
  });

  test('bodyweight chips take reps only and say so', () => {
    const body = card(buildActiveSession(detail(), idle), 'pu');
    expect(body.chips[0]).toMatchObject({ loadKg: null, reps: 8, bodyweight: true, needsLoad: false, primaryText: '8 reps' });
  });

  test('a stepper draft replaces the recommendation and drops the recommended marker', () => {
    const ui: SessionUiState = { ...idle, drafts: { 'sq:0': { loadKg: 82.5, reps: 7 } } };
    const chip = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])] }), ui), 'sq').chips[0];
    expect(chip).toMatchObject({ loadKg: 82.5, reps: 7, recommended: false, primaryText: '82.5 × 7' });
    expect(chip.accessibilityLabel).toBe('82.5 kilograms, 7 reps');
  });

  test('a pending commit shows saving, and a failed one stays editable with its values (DATA-2)', () => {
    const base = detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])] });
    const saving = card(buildActiveSession(base, { ...idle, pending: { 'sq:0': { status: 'saving', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    const failed = card(buildActiveSession(base, { ...idle, pending: { 'sq:0': { status: 'failed', loadKg: 80, reps: 9 } } }), 'sq').chips[0];
    expect(saving).toMatchObject({ saveState: 'saving', setId: null });
    expect(failed).toMatchObject({ saveState: 'failed', setId: null, loadKg: 80, reps: 9 });
  });

  test('a saved set is marked Failed Set only below the range at the recommended load', () => {
    const sets = [entry('a', squat, 0, 80, 5), entry('b', squat, 1, 70, 5), entry('c', squat, 2, 80, 8)];
    const chips = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets }), idle), 'sq').chips;
    expect(chips.slice(0, 3).map((chip) => chip.failedSet)).toEqual([true, false, false]);
  });

  test('warmups are listed first with no recommendation; sets beyond the prescription add one extra chip', () => {
    const sets = [entry('w', squat, 0, 40, 10, 'warmup'), entry('a', squat, 0, 80, 8), entry('b', squat, 1, 80, 8), entry('c', squat, 2, 80, 8)];
    const chips = card(buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets }), idle), 'sq').chips;
    expect(chips.map((chip) => [chip.kind, chip.label, chip.saveState])).toEqual([
      ['warmup', 'Warmup 1', 'saved'], ['working', 'Set 1', 'saved'], ['working', 'Set 2', 'saved'], ['working', 'Set 3', 'saved'], ['extra', 'Extra set', 'idle'],
    ]);
    expect(chips[0]).toMatchObject({ recommended: false, secondaryText: null });
    expect(chips[4]).toMatchObject({ loadKg: 80, reps: 8, recommended: false });
    expect(card(buildActiveSession(detail({ sets }), idle), 'sq').complete).toBe(true);
  });

  test('a Load Reset carries its one reason line', () => {
    const failing = [history([[100, 5], [100, 5], [100, 5]]), { ...history([[100, 5], [100, 5], [100, 5]]), id: 'older' }];
    const squatCard = card(buildActiveSession(detail({ squatHistory: failing }), idle), 'sq');
    expect(squatCard.reasonLine).toBe('Reset after 2 sessions under 6 reps');
    expect(squatCard.chips[0]).toMatchObject({ loadKg: 90, reps: 6 });
  });

  test('a finished session offers only its logged sets, for correction (G9)', () => {
    const content = buildActiveSession(detail({ ended: true, sets: [entry('a', squat, 0, 80, 8)] }), idle);
    expect(content.active).toBe(false);
    expect(card(content, 'sq').chips.map((chip) => chip.saveState)).toEqual(['saved']);
  });

  test('expansion, rest and session progress are passed through', () => {
    const ui: SessionUiState = { ...idle, expandedExerciseId: 'pu', rest: { deadlineMs: 5, durationSeconds: 90 } };
    const content = buildActiveSession(detail({ sets: [entry('a', squat, 0, 80, 8), entry('p', pushUp, 0, null, 10)] }), ui);
    expect(content).toMatchObject({ sessionId: 's-now', templateName: 'Full Body', loggedWorkingSets: 2, prescribedWorkingSets: 5, progressText: '2 of 5 sets', rest: { deadlineMs: 5, durationSeconds: 90 } });
    expect(card(content, 'pu').expanded).toBe(true);
    expect(card(content, 'sq').expanded).toBe(false);
  });

  test('the set sheet carries the exercise increment and whether the set is committed', () => {
    const content = buildActiveSession(detail({ squatHistory: [history([[80, 8], [80, 8], [80, 8]])], sets: [entry('a', squat, 0, 80, 9)] }), idle);
    const squatCard = card(content, 'sq');
    expect(buildSetSheet(squatCard, squatCard.chips[0])).toMatchObject({ title: 'Back Squat · Set 1', setId: 'a', isSaved: true, canDelete: true, incrementKg: 2.5, type: 'working' });
    expect(buildSetSheet(squatCard, squatCard.chips[1])).toMatchObject({ setId: null, isSaved: false, canDelete: false, loadKg: 80, reps: 9 });
  });

  test('the rest override rides on the card', () => {
    const custom = detail();
    custom.exercises[0].templateExercise = { ...squat, restOverrideSeconds: 150 };
    expect(card(buildActiveSession(custom, idle), 'sq').restSeconds).toBe(150);
    expect(card(buildActiveSession(detail(), idle), 'sq').restSeconds).toBe(90);
  });
});

describe('Today', () => {
  const fullBody = { id: 'full-body', name: 'Full Body', exercises: [squat] };
  test('Start the next template, or Resume the active session', () => {
    expect(buildTodayTraining({ active: null, next: fullBody })).toMatchObject({
      action: 'start', buttonLabel: 'Start', title: 'Full Body', detail: 'Next in your rotation', templateId: 'full-body', accessibilityLabel: 'Start Full Body',
    });
    const active = { ...session(), sets: [entry('a', squat, 0, 80, 8), entry('b', squat, 1, 80, 8)] };
    expect(buildTodayTraining({ active, next: fullBody })).toMatchObject({
      action: 'resume', buttonLabel: 'Resume', sessionId: 's-now', detail: '2 sets logged', accessibilityLabel: 'Resume Full Body',
    });
    expect(buildTodayTraining({ active: { ...session(), sets: [] }, next: null }).detail).toBe('In progress');
  });

  test('with no template there is nothing to start', () => {
    expect(buildTodayTraining({ active: null, next: null })).toMatchObject({ action: 'none' });
  });
});

describe('Train (S2)', () => {
  const finished = (id: string, startedAt: number, sets: SetEntry[], completed = true): WorkoutSession & { sets: SetEntry[] } => ({
    ...session({ id, startedAt, endedAt: startedAt + 45 * 60_000, completed }), sets: sets.map((set) => ({ ...set, sessionId: id })),
  });
  const workout = (id: string, startMs: number, durationMin: number, activityType: number) => ({ id, startMs, endMs: startMs + durationMin * 60_000, activityType }) as unknown as HealthWorkout;
  const fullBody = { id: 'full-body', name: 'Full Body', exercises: [squat, pushUp] };
  const upper = { id: 'upper', name: 'Upper', exercises: [squat] };

  test('weekly progress, templates, recent sessions and Other Activity', () => {
    const last = finished('s2', Date.UTC(2026, 10, 9, 8), [entry('a', squat, 0, 100, 10), entry('b', squat, 1, 100, 10)]);
    const old = finished('s1', Date.UTC(2026, 10, 2, 8), [], false);
    const linked = workout('w1', Date.UTC(2026, 10, 9, 8), 45, 50);
    const run = workout('w2', Date.UTC(2026, 10, 10, 7, 30), 30, 37);
    const content = buildTrainingWeek({
      now: t0, program: { rotation: [fullBody, upper] }, weeklySessionTarget: 3, completedThisWeek: 1, sessions: [last, old], active: null, next: upper,
      linking: { links: [{ sessionId: 's2', workoutId: 'w1' }], otherActivity: [run], workouts: [linked, run] },
    }, utc);
    expect(content).toMatchObject({ weekLabel: 'This week', completed: 1, target: 3, progressText: '1 of 3 sessions', targetMet: false, active: null, next: { templateId: 'upper', templateName: 'Upper' } });
    expect(content.progressFraction).toBeCloseTo(1 / 3);
    expect(content.templates).toEqual([
      { id: 'full-body', name: 'Full Body', summaryText: '2 exercises · 5 sets', lastDoneText: 'Last done Mon 9 Nov', isNext: false },
      { id: 'upper', name: 'Upper', summaryText: '1 exercise · 3 sets', lastDoneText: 'Not done yet', isNext: true },
    ]);
    expect(content.recentSessions).toEqual([
      { sessionId: 's2', templateName: 'Full Body', dateText: 'Mon 9 Nov', summaryText: '2 sets · 2,000 kg', statusText: 'Finished', counts: true, linkedWorkoutText: 'Linked: Traditional strength training · 45 min' },
      { sessionId: 's1', templateName: 'Full Body', dateText: 'Mon 2 Nov', summaryText: 'No working sets', statusText: 'Not counted', counts: false, linkedWorkoutText: null },
    ]);
    expect(content.otherActivity).toEqual([{ id: 'w2', title: 'Running', timeText: 'Tue 10 Nov, 07:30', durationText: '30 min' }]);
  });

  test('an active session is offered for Resume and the bar caps at the target', () => {
    const active = { ...session(), sets: [entry('a', squat, 0, 80, 8)] };
    const content = buildTrainingWeek({
      now: t0, program: { rotation: [fullBody] }, weeklySessionTarget: 1, completedThisWeek: 2, sessions: [active], active, next: fullBody,
      linking: { links: [], otherActivity: [], workouts: [] },
    }, utc);
    expect(content.active).toEqual({ sessionId: 's-now', templateName: 'Full Body', detail: '1 set logged' });
    expect(content).toMatchObject({ progressText: '2 of 1 session', progressFraction: 1, targetMet: true });
    expect(content.recentSessions[0]).toMatchObject({ statusText: 'In progress', counts: false });
  });
});

describe('Summary (S5)', () => {
  const base = {
    session: session({ endedAt: t0 + 45 * 60_000, completed: true }),
    summary: { volumeKg: 4320, workingSets: 14, bodyweightReps: 0, setsByMuscleGroup: [{ muscleGroup: 'quadriceps', sets: 9 }, { muscleGroup: 'chest', sets: 5 }] },
    nextTimeLine: 'Bench Press moves to 82.5 × 6', linkedWorkout: null, previous: { startedAt: Date.UTC(2026, 10, 2, 10), prescription: { templateName: 'Full Body' } },
  };
  test('volume, muscle groups, comparison, next-time line and counting', () => {
    const content = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4200, volumeDeltaKg: 120, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(content).toMatchObject({
      templateName: 'Full Body', dateText: 'Mon 9 Nov', durationText: '45 min', volumeText: '4,320 kg', setsText: '14 working sets',
      bodyweightRepsText: null, nextTimeLine: 'Bench Press moves to 82.5 × 6', counts: true, countsText: 'Counts toward your weekly target',
      comparison: { text: '+120 kg vs Full Body on Mon 2 Nov', direction: 'up' }, linkedWorkoutText: null,
    });
    expect(content.muscleGroups).toEqual([
      { muscleGroup: 'quadriceps', label: 'Quadriceps', sets: 9, text: 'Quadriceps · 9 sets' }, { muscleGroup: 'chest', label: 'Chest', sets: 5, text: 'Chest · 5 sets' },
    ]);
  });

  test('down, same and no previous comparison', () => {
    const down = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4500, volumeDeltaKg: -180, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(down.comparison).toEqual({ text: '−180 kg vs Full Body on Mon 2 Nov', direction: 'down' });
    const same = buildSessionSummary({ ...base, comparison: { previousVolumeKg: 4320, volumeDeltaKg: 0, workingSetsDelta: 0, bodyweightRepsDelta: 0 } }, utc);
    expect(same.comparison).toEqual({ text: 'Same as Full Body on Mon 2 Nov', direction: 'same' });
    expect(buildSessionSummary({ ...base, comparison: null, previous: null }, utc).comparison).toBeNull();
  });

  test('a bodyweight-only session shows reps instead of volume; a session without working sets does not count', () => {
    const content = buildSessionSummary({
      ...base, session: session({ endedAt: t0 + 60_000, completed: false }), summary: { volumeKg: 0, workingSets: 0, bodyweightReps: 36, setsByMuscleGroup: [] },
      comparison: { previousVolumeKg: 0, volumeDeltaKg: 0, workingSetsDelta: 0, bodyweightRepsDelta: 6 },
    }, utc);
    expect(content).toMatchObject({ volumeText: '—', bodyweightRepsText: '36 bodyweight reps', counts: false, countsText: 'No working sets, so this session does not count' });
    expect(content.comparison).toEqual({ text: '+6 reps vs Full Body on Mon 2 Nov', direction: 'up' });
  });

  test('a linked Health workout is shown as context', () => {
    const linked = { id: 'w', startMs: t0, endMs: t0 + 50 * 60_000, activityType: 20 } as unknown as HealthWorkout;
    expect(buildSessionSummary({ ...base, comparison: null, previous: null, linkedWorkout: linked }, utc).linkedWorkoutText)
      .toBe('Linked: Functional strength training · 50 min');
  });
});

describe('Exercise history', () => {
  test('combines sessions across templates, newest first, with warmups kept apart', () => {
    const library = { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps' as const, equipment: 'barbell' as const, bodyweight: false };
    const content = buildExerciseHistory('back-squat', library, [
      { session: session({ id: 'b', startedAt: Date.UTC(2026, 10, 9, 10) }), sets: [entry('1', squat, 1, 80, 9), entry('0', squat, 0, 80, 10), entry('w', squat, 0, 40, 10, 'warmup')] },
      { session: session({ id: 'a', startedAt: Date.UTC(2026, 10, 2, 10), prescription: { templateName: 'Lower', exercises: [squat] } }), sets: [entry('9', squat, 0, null, 12, 'warmup')] },
    ], utc);
    expect(content).toMatchObject({ name: 'Back Squat', muscleGroupLabel: 'Quadriceps', sessionCountText: '2 sessions' });
    expect(content.sessions).toEqual([
      { sessionId: 'b', templateName: 'Full Body', dateText: 'Mon 9 Nov', setsText: '80 × 10, 80 × 9', warmupText: 'Warmup 40 × 10' },
      { sessionId: 'a', templateName: 'Lower', dateText: 'Mon 2 Nov', setsText: 'Warmups only', warmupText: 'Warmup 12 reps' },
    ]);
  });
});
