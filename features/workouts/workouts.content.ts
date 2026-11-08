import type { ExerciseLibraryEntry, SessionTemplate, TrainingProgram } from './workouts.schemas';

export const exerciseLibraryVersion = 1;

// IDs are forever: updates may add exercises, but must never remove or repurpose an ID.
export const exerciseLibrary = [
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', bodyweight: false },
  { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', bodyweight: false },
  { id: 'push-up', name: 'Push-up', muscleGroup: 'chest', equipment: 'none', bodyweight: true },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'machine', bodyweight: false },
  { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', bodyweight: false },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', bodyweight: false },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'dumbbell', bodyweight: false },
  { id: 'dumbbell-lateral-raise', name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', bodyweight: false },
  { id: 'machine-shoulder-press', name: 'Machine Shoulder Press', muscleGroup: 'shoulders', equipment: 'machine', bodyweight: false },
  { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell', bodyweight: false },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', bodyweight: false },
  { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'biceps', equipment: 'cable', bodyweight: false },
  { id: 'cable-triceps-pushdown', name: 'Cable Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable', bodyweight: false },
  { id: 'dumbbell-overhead-triceps-extension', name: 'Dumbbell Overhead Triceps Extension', muscleGroup: 'triceps', equipment: 'dumbbell', bodyweight: false },
  { id: 'lying-triceps-extension', name: 'Lying Triceps Extension', muscleGroup: 'triceps', equipment: 'barbell', bodyweight: false },
  { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quadriceps', equipment: 'machine', bodyweight: false },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'quadriceps', equipment: 'machine', bodyweight: false },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', bodyweight: false },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', bodyweight: false },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', bodyweight: false },
  { id: 'barbell-hip-thrust', name: 'Barbell Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', bodyweight: false },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'glutes', equipment: 'none', bodyweight: true },
  { id: 'cable-kickback', name: 'Cable Kickback', muscleGroup: 'glutes', equipment: 'cable', bodyweight: false },
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'machine', bodyweight: false },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'calves', equipment: 'machine', bodyweight: false },
  { id: 'bodyweight-calf-raise', name: 'Bodyweight Calf Raise', muscleGroup: 'calves', equipment: 'none', bodyweight: true },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'core', equipment: 'none', bodyweight: true },
  { id: 'reverse-crunch', name: 'Reverse Crunch', muscleGroup: 'core', equipment: 'none', bodyweight: true },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable', bodyweight: false },
] satisfies ExerciseLibraryEntry[];

export function getExerciseById(id: string): ExerciseLibraryEntry | undefined {
  return exerciseLibrary.find((exercise) => exercise.id === id);
}

// Keep template and Template Exercise IDs stable across Plan Versions (TRN-5).
export const starterSessionTemplate: SessionTemplate = {
  id: 'full-body',
  name: 'Full Body',
  exercises: [
    { id: 'full-body-back-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    { id: 'full-body-bench-press', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    { id: 'full-body-lat-pulldown', exerciseId: 'lat-pulldown', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 5 },
    { id: 'full-body-romanian-deadlift', exerciseId: 'romanian-deadlift', workingSets: 3, repRange: { min: 8, max: 12 }, incrementKg: 2.5 },
    { id: 'full-body-dumbbell-shoulder-press', exerciseId: 'dumbbell-shoulder-press', workingSets: 2, repRange: { min: 8, max: 12 }, incrementKg: 2 },
  ],
};

export const starterTrainingProgram: TrainingProgram = { rotation: [starterSessionTemplate] };
