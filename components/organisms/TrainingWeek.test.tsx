import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TrainingWeekContent } from '@/features/workouts';
import { TrainingWeek } from './TrainingWeek';

const base: TrainingWeekContent = {
  weekLabel: 'This week', completed: 2, target: 3, progressText: '2 of 3 sessions', progressFraction: 2 / 3, targetMet: false,
  active: null, next: { templateId: 'upper', templateName: 'Upper' },
  templates: [
    { id: 'lower', name: 'Lower', summaryText: '4 exercises · 12 sets', lastDoneText: 'Last done Mon 2 Nov', isNext: false },
    { id: 'upper', name: 'Upper', summaryText: '5 exercises · 15 sets', lastDoneText: 'Not done yet', isNext: true },
  ],
  recentSessions: [
    { sessionId: 's2', templateName: 'Lower', dateText: 'Mon 9 Nov', summaryText: '12 sets · 4,320 kg', statusText: 'Finished', counts: true,
      linkedWorkoutText: 'Linked: Traditional strength training · 52 min' },
    { sessionId: 's1', templateName: 'Upper', dateText: 'Sat 7 Nov', summaryText: 'No working sets', statusText: 'Not counted', counts: false, linkedWorkoutText: null },
  ],
  otherActivity: [{ id: 'w1', title: 'Running', timeText: 'Tue 10 Nov, 07:30', durationText: '30 min' }],
};
const handlers = () => ({ onStartTemplate: jest.fn(), onOpenSession: jest.fn() });

test('shows weekly progress as text and a progress bar', async () => {
  await render(<TrainingWeek content={base} {...handlers()} />);
  expect(screen.getByText('This week')).toBeOnTheScreen();
  expect(screen.getByText('2 of 3 sessions')).toBeOnTheScreen();
  expect(screen.getByRole('progressbar', { name: 'Weekly sessions' })).toHaveProp('accessibilityValue', { min: 0, max: 3, now: 2, text: '2 of 3 sessions' });
});

test('says so, in words, once the weekly target is met', async () => {
  await render(<TrainingWeek content={{ ...base, completed: 3, progressText: '3 of 3 sessions', targetMet: true }} {...handlers()} />);
  expect(screen.getByText('Weekly target met')).toBeOnTheScreen();
});

test('lists templates, marks the next one in words, and starts a tapped template', async () => {
  const h = handlers();
  await render(<TrainingWeek content={base} {...h} />);
  expect(screen.getByText('Next in your rotation')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Lower, 4 exercises · 12 sets, Last done Mon 2 Nov' }));
  expect(h.onStartTemplate).toHaveBeenCalledWith('lower');
});

test('templates cannot be started while a session is in progress', async () => {
  const h = handlers();
  await render(<TrainingWeek content={{ ...base, active: { sessionId: 'a', templateName: 'Upper', detail: '3 sets logged' } }} {...h} />);
  const row = screen.getByRole('button', { name: 'Lower, 4 exercises · 12 sets, Last done Mon 2 Nov' });
  expect(row).toBeDisabled();
  expect(screen.getByText('Finish or resume Upper before starting another session.')).toBeOnTheScreen();
  await fireEvent.press(row);
  expect(h.onStartTemplate).not.toHaveBeenCalled();
});

test('a busy start disables the template rows', async () => {
  await render(<TrainingWeek content={base} {...handlers()} busy />);
  expect(screen.getByRole('button', { name: 'Lower, 4 exercises · 12 sets, Last done Mon 2 Nov' })).toBeDisabled();
});

test('recent sessions show whether they count, with the linked workout as context', async () => {
  const h = handlers();
  await render(<TrainingWeek content={base} {...h} />);
  expect(screen.getByText('Linked: Traditional strength training · 52 min')).toBeOnTheScreen();
  expect(screen.getByText('Finished')).toBeOnTheScreen();
  expect(screen.getByText('Not counted')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Lower, Mon 9 Nov, 12 sets · 4,320 kg, Finished' }));
  expect(h.onOpenSession).toHaveBeenCalledWith('s2');
});

test('Other Activity is context only and never counts', async () => {
  await render(<TrainingWeek content={base} {...handlers()} />);
  expect(screen.getByRole('header', { name: 'Other Activity' })).toBeOnTheScreen();
  expect(screen.getByText('Running')).toBeOnTheScreen();
  expect(screen.getByText('Tue 10 Nov, 07:30 · 30 min')).toBeOnTheScreen();
  expect(screen.getByText('From Health. Not counted toward your week.')).toBeOnTheScreen();
});

test('hides Other Activity when there is none', async () => {
  await render(<TrainingWeek content={{ ...base, otherActivity: [] }} {...handlers()} />);
  expect(screen.queryByText('Other Activity')).toBeNull();
});

test('calm empty states when there are no templates or sessions', async () => {
  await render(<TrainingWeek content={{ ...base, templates: [], recentSessions: [], next: null, otherActivity: [] }} {...handlers()} />);
  expect(screen.getByText('No Session Templates yet. Add one in your Training Program.')).toBeOnTheScreen();
  expect(screen.getByText('No sessions yet. Your first one will appear here.')).toBeOnTheScreen();
});

test('keeps each decision point to five choices or fewer', async () => {
  const many = Array.from({ length: 7 }, (_, index) => ({ id: `t${index}`, name: `T${index}`, summaryText: '1 exercise · 3 sets', lastDoneText: 'Not done yet', isNext: false }));
  await render(<TrainingWeek content={{ ...base, templates: many }} {...handlers()} />);
  expect(screen.getByRole('button', { name: 'Show all 7 templates' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: /^T6,/ })).toBeNull();
});
