import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ProgramEditorViewModel } from '@/features/workouts';
import { programTools as tools } from '@/components/organisms/__fixtures__/program-tools';
import { ProgramEditorTemplate } from './ProgramEditorTemplate';

jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 0 }));

const ready: ProgramEditorViewModel = {
  status: 'ready', versionLabel: 'Plan v2', weeklyTargetOptions: [1, 2, 3, 4, 5, 6],
  library: [{ id: 'back-squat', name: 'Back Squat', muscleGroup: 'quadriceps', equipment: 'barbell', bodyweight: false }],
  draft: { weeklySessionTarget: 3, trainingProgram: { rotation: [{
    id: 'full-body', name: 'Full Body', exercises: [{ id: 'fb-squat', exerciseId: 'back-squat', workingSets: 3, repRange: { min: 6, max: 10 }, incrementKg: 2.5 }],
  }] } },
};
const props = () => ({
  defaultRestSeconds: 90, tools,
  onSave: jest.fn(async () => ({ saved: true as const, changed: true })),
});

test('shows the editor with Save as the primary action', async () => {
  const p = props();
  await render(<ProgramEditorTemplate model={ready} {...p} />);
  expect(screen.getByText('Editing from Plan v2')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(p.onSave).toHaveBeenCalledTimes(1));
});

test('loading and error states leave the record untouched', async () => {
  const retry = jest.fn();
  await render(<ProgramEditorTemplate model={{ status: 'loading' }} {...props()} />);
  expect(screen.getByText('Loading your program…')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  await screen.rerender(<ProgramEditorTemplate model={{ status: 'error', retry }} {...props()} />);
  expect(screen.getByText('Couldn’t read your program. Your record hasn’t been changed.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
