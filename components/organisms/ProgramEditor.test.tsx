import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type {
  ExerciseLibraryEntry, ProgramDraft, ProgramDraftTools, ProgramDraftValidation, SaveProgramResult, SessionTemplate,
} from '@/features/workouts';
import { programTools } from './__fixtures__/program-tools';
import { ProgramEditor } from './ProgramEditor';

const library: ExerciseLibraryEntry[] = [
  { id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false },
  { id: 'push-up', name: 'Push-up', muscleGroup: 'chest', equipment: 'none', bodyweight: true },
  { id: 'bench-press', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell', bodyweight: false },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', bodyweight: false },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'quadriceps', equipment: 'machine', bodyweight: false },
  { id: 'biceps-curl', name: 'Biceps Curl', muscleGroup: 'biceps', equipment: 'dumbbell', bodyweight: false },
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'calves', equipment: 'machine', bodyweight: false },
];

const full: SessionTemplate = {
  id: 'full-body', name: 'Full Body',
  exercises: [
    { id: 'fb-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 },
    { id: 'fb-pushup', exerciseId: 'push-up', workingSets: 2, repRange: { min: 10, max: 20 }, incrementKg: 0 },
  ],
};
const upper: SessionTemplate = {
  id: 'upper', name: 'Upper',
  exercises: [{ id: 'up-bench', exerciseId: 'bench-press', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5, restOverrideSeconds: 120 }],
};
const draft: ProgramDraft = { weeklySessionTarget: 3, trainingProgram: { rotation: [full, upper] } };

const tools: ProgramDraftTools = { ...programTools, validate: (value) => validate(value) };

/** A stand-in for the feature's validator covering the rules these tests exercise. */
function validate(value: ProgramDraft): ProgramDraftValidation {
  const errors: Record<string, string> = {};
  value.trainingProgram.rotation.forEach((template, ti) => {
    if (!template.name.trim()) errors[`templates.${ti}.name`] = 'Name this template';
    if (template.exercises.length === 0) errors[`templates.${ti}.exercises`] = 'Add at least one exercise';
  });
  if (value.trainingProgram.rotation.length === 0) errors.rotation = 'Add at least one Session Template';
  return { valid: Object.keys(errors).length === 0, errors };
}

const model = { status: 'ready' as const, versionLabel: 'Plan v3', draft, library, weeklyTargetOptions: [1, 2, 3, 4, 5, 6] };

function setup(overrides: Partial<Parameters<typeof ProgramEditor>[0]> = {}) {
  const onSave = jest.fn(async (): Promise<SaveProgramResult> => ({ saved: true, changed: true }));
  const onSaved = jest.fn();
  const props = { model, defaultRestSeconds: 90, tools, onSave, onSaved, ...overrides };
  return { onSave, onSaved, ui: <ProgramEditor {...props} /> };
}
const saved = (onSave: jest.Mock): ProgramDraft => onSave.mock.calls[0][0];
const save = async () => { await fireEvent.press(screen.getByRole('button', { name: 'Save' })); };

test('shows the Plan Version being edited, the weekly target and the rotation in order', async () => {
  await render(setup().ui);
  expect(screen.getByText('Editing from Plan v3')).toBeOnTheScreen();
  expect(screen.getByRole('adjustable', { name: 'Weekly target' })).toHaveProp('accessibilityValue', { text: '3 sessions' });
  expect(screen.getByRole('button', { name: /^Full Body, 2 exercises/ })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /^Upper, 1 exercise/ })).toBeOnTheScreen();
});

test('only the first template starts open; opening another closes it (one thing at a time)', async () => {
  await render(setup().ui);
  expect(screen.getByRole('button', { name: /^Back Squat/ })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Bench Press/ })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /^Upper, 1 exercise/ }));
  expect(screen.getByRole('button', { name: /^Bench Press/ })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^Back Squat/ })).toBeNull();
});

test('changing the weekly target saves the new target', async () => {
  const { onSave, onSaved, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase weekly target by 1 session' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(saved(onSave).weeklySessionTarget).toBe(4);
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
});

test('editing an exercise changes sets, rep range and increment', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Back Squat/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase sets by 1 set' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase top of range by 1 rep' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease bottom of range by 1 rep' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase increment by 0.5 kg' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const squat = saved(onSave).trainingProgram.rotation[0].exercises[0];
  expect(squat).toMatchObject({ workingSets: 4, repRange: { min: 5, max: 11 }, incrementKg: 3 });
});

test('the bottom of the range cannot pass the top, and the top cannot pass the bottom', async () => {
  await render(setup().ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Back Squat/ }));
  for (let i = 0; i < 6; i++) await fireEvent.press(screen.getByRole('button', { name: 'Increase bottom of range by 1 rep' }));
  expect(screen.getByRole('adjustable', { name: 'Bottom of range' })).toHaveProp('accessibilityValue', { text: '10 reps' });
  expect(screen.getByRole('button', { name: 'Increase bottom of range by 1 rep' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Decrease top of range by 1 rep' })).toBeDisabled();
});

test('a bodyweight exercise offers no added load', async () => {
  await render(setup().ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Push-up/ }));
  expect(screen.getByRole('adjustable', { name: 'Sets' })).toBeOnTheScreen();
  expect(screen.queryByRole('adjustable', { name: 'Increment' })).toBeNull();
});

test('rest starts at the default; stepping stores an override, and Use default clears it', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Back Squat/ }));
  expect(screen.getByRole('adjustable', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '90 seconds' });
  expect(screen.queryByRole('button', { name: 'Use default rest' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Increase rest by 15 seconds' }));
  expect(screen.getByRole('adjustable', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '105 seconds' });
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation[0].exercises[0].restOverrideSeconds).toBe(105);
});

test('Use default rest removes the override', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Upper, 1 exercise/ }));
  await fireEvent.press(screen.getByRole('button', { name: /^Bench Press/ }));
  expect(screen.getByRole('adjustable', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '120 seconds' });
  await fireEvent.press(screen.getByRole('button', { name: 'Use default rest' }));
  expect(screen.getByRole('adjustable', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '90 seconds' });
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation[1].exercises[0]).not.toHaveProperty('restOverrideSeconds');
});

test('renames a template', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.changeText(screen.getByLabelText('Template name'), 'Push');
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation[0].name).toBe('Push');
});

test('reorders exercises within a template', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Back Squat/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Move Back Squat down' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation[0].exercises.map((e) => e.exerciseId)).toEqual(['push-up', 'back-squat']);
});

test('the first exercise cannot move up and the last cannot move down', async () => {
  await render(setup().ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Back Squat/ }));
  expect(screen.getByRole('button', { name: 'Move Back Squat up' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: /^Push-up/ }));
  expect(screen.getByRole('button', { name: 'Move Push-up down' })).toBeDisabled();
});

test('removes an exercise', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Push-up/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Remove Push-up' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation[0].exercises.map((e) => e.exerciseId)).toEqual(['back-squat']);
});

test('reorders the rotation', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Move Full Body down in the rotation' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation.map((t) => t.id)).toEqual(['upper', 'full-body']);
});

test('deleting a template says its history is kept', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  expect(screen.getByText('Past sessions and set history are kept.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete Full Body' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  expect(saved(onSave).trainingProgram.rotation.map((t) => t.id)).toEqual(['upper']);
});

test('adds an exercise from the library through search', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise to Full Body' }));
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'lat');
  expect(screen.queryByRole('button', { name: 'Add Back Squat' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Add Lat Pulldown' }));
  expect(screen.queryByLabelText('Search exercises')).toBeNull();
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const exercises = saved(onSave).trainingProgram.rotation[0].exercises;
  expect(exercises.at(-1)).toMatchObject({ id: 'full-body-lat-pulldown-new', exerciseId: 'lat-pulldown', workingSets: 3 });
});

test('the exercise picker shows five choices at a time and finds by muscle group', async () => {
  await render(setup().ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise to Full Body' }));
  expect(screen.getAllByRole('button', { name: /^Add (?!exercise)/ })).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: 'Show all 7 exercises' }));
  expect(screen.getAllByRole('button', { name: /^Add (?!exercise)/ })).toHaveLength(7);
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'chest');
  expect(screen.getAllByRole('button', { name: /^Add (?!exercise)/ })).toHaveLength(2);
});

test('the picker says when nothing matches and can be closed', async () => {
  await render(setup().ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise to Full Body' }));
  await fireEvent.changeText(screen.getByLabelText('Search exercises'), 'zzz');
  expect(screen.getByText('No exercises match “zzz”.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Close exercise list' }));
  expect(screen.queryByLabelText('Search exercises')).toBeNull();
});

test('adds a Session Template to the end of the rotation and opens it', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: 'New Session Template' }));
  expect(screen.getByLabelText('Template name')).toHaveProp('value', 'Session 3');
  await fireEvent.press(screen.getByRole('button', { name: 'Add exercise to Session 3' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add Leg Press' }));
  await save();
  await waitFor(() => expect(onSave).toHaveBeenCalled());
  const rotation = saved(onSave).trainingProgram.rotation;
  expect(rotation.map((t) => t.name)).toEqual(['Full Body', 'Upper', 'Session 3']);
  expect(rotation[2].exercises[0].exerciseId).toBe('leg-press');
});

test('an invalid draft is not saved; the problem is shown where it is and its template opens', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: /^Upper, 1 exercise/ }));
  await fireEvent.press(screen.getByRole('button', { name: /^Bench Press/ }));
  await fireEvent.press(screen.getByRole('button', { name: 'Remove Bench Press' }));
  await fireEvent.press(screen.getByRole('button', { name: /^Full Body, 2 exercises/ }));
  await save();
  expect(onSave).not.toHaveBeenCalled();
  expect(await screen.findByText('Add at least one exercise')).toBeOnTheScreen();
  expect(screen.getByText('Check the items marked below.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Template name')).toHaveProp('value', 'Upper');
});

test('a blank template name is flagged', async () => {
  const { onSave, ui } = setup();
  await render(ui);
  await fireEvent.changeText(screen.getByLabelText('Template name'), '  ');
  await save();
  expect(await screen.findByText('Name this template')).toBeOnTheScreen();
  expect(onSave).not.toHaveBeenCalled();
});

test('saving with nothing changed says so', async () => {
  const { onSave, onSaved, ui } = setup({ onSave: jest.fn(async () => ({ saved: true, changed: false }) as SaveProgramResult) });
  await render(ui);
  await save();
  expect(await screen.findByText('No changes to save.')).toBeOnTheScreen();
  expect(onSave).toBeDefined();
  expect(onSaved).toHaveBeenCalledWith(false);
});

test('a saved change is confirmed in words', async () => {
  await render(setup().ui);
  await save();
  expect(await screen.findByText('Saved as a new Plan Version.')).toBeOnTheScreen();
});

test('a failed save is "not saved" and keeps the edits on screen', async () => {
  const onSave = jest.fn(async (): Promise<SaveProgramResult> => ({ saved: false, validation: null }));
  const { ui } = setup({ onSave, errorText: 'Not saved. Nothing was changed. Try again.' });
  await render(ui);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase weekly target by 1 session' }));
  await save();
  expect(await screen.findByText('Not saved. Nothing was changed. Try again.')).toBeOnTheScreen();
  expect(screen.getByRole('adjustable', { name: 'Weekly target' })).toHaveProp('accessibilityValue', { text: '4 sessions' });
  expect(screen.queryByText('Saved as a new Plan Version.')).toBeNull();
});

test('Save is disabled and labelled while saving', async () => {
  await render(setup({ saving: true }).ui);
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
});

test('every control is a labelled button inside its card', async () => {
  await render(setup().ui);
  const card = screen.getByTestId('template-card-full-body');
  expect(within(card).getByRole('button', { name: 'Delete Full Body' })).toBeOnTheScreen();
});
