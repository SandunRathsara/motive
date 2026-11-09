import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TodayTrainingViewModel } from '@/features/workouts';
import { TodayTrainingCard } from './TodayTrainingCard';

const start: TodayTrainingViewModel = {
  status: 'ready', action: 'start', templateId: 'upper', templateName: 'Upper', sessionId: null,
  buttonLabel: 'Start', title: 'Upper', detail: 'Next in your rotation', accessibilityLabel: 'Start Upper',
};
const resume: TodayTrainingViewModel = {
  status: 'ready', action: 'resume', templateId: 'upper', templateName: 'Upper', sessionId: 's1',
  buttonLabel: 'Resume', title: 'Upper', detail: '4 sets logged', accessibilityLabel: 'Resume Upper',
};
const none: TodayTrainingViewModel = {
  status: 'ready', action: 'none', templateId: null, templateName: null, sessionId: null,
  buttonLabel: 'Start', title: 'No Session Templates', detail: 'Add a Session Template in your Training Program', accessibilityLabel: 'No Session Templates',
};

test('Start shows the next template and starts it with one tap', async () => {
  const onOpen = jest.fn();
  await render(<TodayTrainingCard model={start} onOpen={onOpen} />);
  expect(screen.getByRole('header', { name: 'Training' })).toBeOnTheScreen();
  expect(screen.getByText('Upper')).toBeOnTheScreen();
  expect(screen.getByText('Next in your rotation')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Start Upper' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('Resume shows progress and resumes with one tap', async () => {
  const onOpen = jest.fn();
  await render(<TodayTrainingCard model={resume} onOpen={onOpen} />);
  expect(screen.getByText('4 sets logged')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Resume Upper' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('with no templates there is no action, only guidance', async () => {
  await render(<TodayTrainingCard model={none} onOpen={jest.fn()} />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText('Add a Session Template in your Training Program')).toBeOnTheScreen();
});

test('a busy start disables the button and a failed start is shown as text', async () => {
  await render(<TodayTrainingCard model={start} busy errorText="Not saved. Nothing was changed. Try again." onOpen={jest.fn()} />);
  expect(screen.getByRole('button', { name: 'Start Upper' })).toBeDisabled();
  expect(screen.getByText('Not saved. Nothing was changed. Try again.')).toBeOnTheScreen();
});

test('loading and error states never block the rest of Today', async () => {
  const retry = jest.fn();
  await render(<TodayTrainingCard model={{ status: 'loading' }} onOpen={jest.fn()} />);
  expect(screen.getByText('Loading your training…')).toBeOnTheScreen();
  await screen.rerender(<TodayTrainingCard model={{ status: 'error', retry }} onOpen={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
