import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TrainingWeekContent, TrainingWeekViewModel } from '@/features/workouts';
import { TrainTemplate } from './TrainTemplate';

const content: TrainingWeekContent = {
  weekLabel: 'This week', completed: 1, target: 3, progressText: '1 of 3 sessions', progressFraction: 1 / 3, targetMet: false,
  active: null, next: { templateId: 'upper', templateName: 'Upper' },
  templates: [{ id: 'upper', name: 'Upper', summaryText: '5 exercises · 15 sets', lastDoneText: 'Not done yet', isNext: true }],
  recentSessions: [], otherActivity: [],
};
const ready: TrainingWeekViewModel = { status: 'ready', ...content };
const actions = () => ({ onStartTemplate: jest.fn(), onResume: jest.fn(), onOpenSession: jest.fn(), onEditProgram: jest.fn() });

test('the one primary action starts the next template', async () => {
  const a = actions();
  await render(<TrainTemplate model={ready} {...a} />);
  expect(screen.getByRole('header', { name: 'Train' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start Upper' }));
  expect(a.onStartTemplate).toHaveBeenCalledWith('upper');
});

test('with a session in progress the primary action resumes it', async () => {
  const a = actions();
  const model: TrainingWeekViewModel = { ...ready, active: { sessionId: 'a1', templateName: 'Upper', detail: '4 sets logged' } } as TrainingWeekViewModel;
  await render(<TrainTemplate model={model} {...a} />);
  expect(screen.queryByRole('button', { name: 'Start Upper' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Resume Upper' }));
  expect(a.onResume).toHaveBeenCalledTimes(1);
  expect(screen.getByText('4 sets logged')).toBeOnTheScreen();
});

test('a busy start disables the primary action', async () => {
  await render(<TrainTemplate model={ready} busy {...actions()} />);
  expect(screen.getByRole('button', { name: 'Start Upper' })).toBeDisabled();
});

test('an empty rotation has no primary action and points to the program', async () => {
  const a = actions();
  await render(<TrainTemplate model={{ ...ready, next: null, templates: [] }} {...a} />);
  expect(screen.queryByRole('button', { name: /^Start / })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Training Program' }));
  expect(a.onEditProgram).toHaveBeenCalledTimes(1);
});

test('shows a failed start as plain text, not a dialog', async () => {
  await render(<TrainTemplate model={ready} errorText="Not saved. Nothing was changed. Try again." {...actions()} />);
  expect(screen.getByText('Not saved. Nothing was changed. Try again.')).toBeOnTheScreen();
});

test('loading and error states', async () => {
  const retry = jest.fn();
  await render(<TrainTemplate model={{ status: 'loading' }} {...actions()} />);
  expect(screen.getByText('Loading your training…')).toBeOnTheScreen();
  await screen.rerender(<TrainTemplate model={{ status: 'error', retry }} {...actions()} />);
  expect(screen.getByText('Couldn’t read your training. Your record hasn’t been changed.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
