import type { ActiveSessionActions, ActiveSessionContent, ExerciseCardViewModel, SetChipViewModel, SetSheetViewModel } from '@/features/workouts';

/** Test builders for the session-screen view models. Values mirror what the workouts hooks produce. */

export function chip(overrides: Partial<SetChipViewModel> = {}): SetChipViewModel {
  return {
    key: 'full-body-back-squat:0', templateExerciseId: 'full-body-back-squat', label: 'Set 1', kind: 'working', setId: null,
    loadKg: 80, reps: 9, bodyweight: false, recommended: true, last: { loadKg: 80, reps: 8 }, saveState: 'idle', needsLoad: false,
    failedSet: false, primaryText: '80 × 9', secondaryText: 'last 80 × 8', accessibilityLabel: '80 kilograms, 9 reps, recommended',
    ...overrides,
  };
}

export function card(overrides: Partial<ExerciseCardViewModel> = {}): ExerciseCardViewModel {
  return {
    templateExerciseId: 'full-body-back-squat', exerciseId: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps',
    muscleGroupLabel: 'Quadriceps', bodyweight: false, prescriptionText: '3 × 6–10', progressText: '1 of 3 sets', expanded: true,
    complete: false, firstSession: false, incrementKg: 2.5, repRange: { min: 6, max: 10 }, restSeconds: 90, reasonLine: null,
    chips: [
      chip({ setId: 'set-1', saveState: 'saved', recommended: true, accessibilityLabel: '80 kilograms, 9 reps, recommended, saved' }),
      chip({ key: 'full-body-back-squat:1', label: 'Set 2' }),
      chip({ key: 'full-body-back-squat:2', label: 'Set 3', recommended: true }),
    ],
    ...overrides,
  };
}

export function content(overrides: Partial<ActiveSessionContent> = {}): ActiveSessionContent {
  return {
    sessionId: 'session-1', templateName: 'Full Body', startedAt: 1_000_000, active: true, deload: false,
    exercises: [
      card({ expanded: true }),
      card({
        templateExerciseId: 'full-body-bench-press', exerciseId: 'bench-press', name: 'Bench Press', muscleGroup: 'chest',
        muscleGroupLabel: 'Chest', expanded: false, progressText: '0 of 3 sets',
        chips: [chip({ key: 'full-body-bench-press:0', templateExerciseId: 'full-body-bench-press', loadKg: 60, accessibilityLabel: '60 kilograms, 9 reps, recommended' })],
      }),
    ],
    loggedWorkingSets: 1, prescribedWorkingSets: 6, progressText: '1 of 6 sets', rest: null,
    ...overrides,
  };
}

export function sheetModel(overrides: Partial<SetSheetViewModel> = {}): SetSheetViewModel {
  return {
    title: 'Back Squat · Set 2', templateExerciseId: 'full-body-back-squat', setId: null, chipKey: 'full-body-back-squat:1', type: 'working',
    loadKg: 80, reps: 9, bodyweight: false, incrementKg: 2.5, isSaved: false, saveState: 'idle', canDelete: false,
    ...overrides,
  };
}

export function actions(overrides: Partial<ActiveSessionActions> = {}): jest.Mocked<ActiveSessionActions> {
  return {
    touch: jest.fn(), expand: jest.fn(), adjust: jest.fn(async () => true), logChip: jest.fn(async () => true),
    logSet: jest.fn(async () => true), editSet: jest.fn(async () => true), deleteSet: jest.fn(async () => true),
    finish: jest.fn(async () => 'session-1'), deleteSession: jest.fn(async () => true), addThirtySeconds: jest.fn(), skipRest: jest.fn(),
    now: jest.fn(() => 1_000_000 + 754_000), ...overrides,
  } as jest.Mocked<ActiveSessionActions>;
}
