import { fireEvent, render, screen } from '@testing-library/react-native';
import { ExerciseCard } from './ExerciseCard';
import { card, chip } from './__fixtures__/session';

const handlers = () => ({ onToggle: jest.fn(), onLogChip: jest.fn(), onAdjust: jest.fn(), onOpenSheet: jest.fn(), onDirectEntry: jest.fn() });

test('collapsed: shows the exercise, its prescription and progress, and expands with one tap', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card({ expanded: false })} {...h} />);
  const header = screen.getByRole('button', { name: 'Back Squat, 3 × 6–10, 1 of 3 sets' });
  expect(header).toHaveProp('accessibilityState', expect.objectContaining({ expanded: false }));
  expect(screen.getByText('Quadriceps · 3 × 6–10')).toBeOnTheScreen();
  expect(screen.queryByText('Set 2')).toBeNull();
  await fireEvent.press(header);
  expect(h.onToggle).toHaveBeenCalledWith('full-body-back-squat');
});

test('expanded: each working set is a chip with its Recommended Set, last session and VoiceOver label', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card()} {...h} />);
  expect(screen.getByRole('button', { name: /^Back Squat/ })).toHaveProp('accessibilityState', expect.objectContaining({ expanded: true }));
  expect(screen.getByText('Set 1')).toBeOnTheScreen();
  expect(screen.getByText('Set 2')).toBeOnTheScreen();
  expect(screen.getAllByText('last 80 × 8').length).toBeGreaterThan(0);
  const next = screen.getAllByRole('button', { name: '80 kilograms, 9 reps, recommended' });
  await fireEvent.press(next[0]);
  expect(h.onLogChip).toHaveBeenCalledWith('full-body-back-squat:1');
});

test('a saved chip shows saved and cannot be logged twice', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card()} {...h} />);
  const saved = screen.getByRole('button', { name: '80 kilograms, 9 reps, recommended, saved' });
  expect(saved).toBeDisabled();
  expect(screen.getByText('✓ Saved')).toBeOnTheScreen();
  await fireEvent.press(saved);
  expect(h.onLogChip).not.toHaveBeenCalled();
});

test('chip states: saving is not tappable, a failed commit reads not saved and retries on tap', async () => {
  const h = handlers();
  const model = card({
    chips: [
      chip({ saveState: 'saving', accessibilityLabel: '80 kilograms, 9 reps, recommended, saving' }),
      chip({ key: 'k:1', label: 'Set 2', saveState: 'failed' }),
    ],
  });
  await render(<ExerciseCard model={model} {...h} />);
  expect(screen.getByText('Saving…')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /saving$/ })).toBeDisabled();
  expect(screen.getByText('Not saved. Tap to retry')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: /not saved$/ }));
  expect(h.onLogChip).toHaveBeenCalledWith('k:1');
});

test('first session: no Recommended Set, load must be set first, reps start at the bottom of the range', async () => {
  const h = handlers();
  const model = card({
    firstSession: true,
    chips: [chip({ key: 'k:0', loadKg: null, reps: 6, recommended: false, last: null, needsLoad: true, accessibilityLabel: 'Load not set, 6 reps' })],
  });
  await render(<ExerciseCard model={model} {...h} />);
  const first = screen.getByRole('button', { name: 'Load not set, 6 reps' });
  expect(first).toBeDisabled();
  expect(screen.getByText('Set a load')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  expect(h.onAdjust).toHaveBeenCalledWith('k:0', { loadKg: 2.5 });
});

test('steppers belong to the next unlogged set and adjust the draft by the increment and ±1 rep', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card()} {...h} />);
  expect(screen.getAllByRole('adjustable', { name: 'Load' })).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  expect(h.onAdjust).toHaveBeenLastCalledWith('full-body-back-squat:1', { loadKg: 82.5 });
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease reps by 1 rep' }));
  expect(h.onAdjust).toHaveBeenLastCalledWith('full-body-back-squat:1', { reps: 8 });
});

test('card steppers step aside while the set sheet is open', async () => {
  await render(<ExerciseCard model={card()} steppers={false} {...handlers()} />);
  expect(screen.queryByRole('adjustable', { name: 'Load' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Edit Set 2' })).toBeOnTheScreen();
});

test('long-press on a stepper value asks for direct entry', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card()} {...h} />);
  await fireEvent(screen.getByRole('adjustable', { name: 'Load' }), 'longPress');
  expect(h.onDirectEntry).toHaveBeenCalledWith('full-body-back-squat:1', 'load');
  await fireEvent(screen.getByRole('adjustable', { name: 'Reps' }), 'longPress');
  expect(h.onDirectEntry).toHaveBeenLastCalledWith('full-body-back-squat:1', 'reps');
});

test('bodyweight exercises take reps only: no load stepper, reps-only chip', async () => {
  const h = handlers();
  const model = card({
    bodyweight: true, name: 'Push-up',
    chips: [chip({ key: 'p:0', bodyweight: true, loadKg: null, reps: 12, accessibilityLabel: '12 reps, bodyweight, recommended' })],
  });
  await render(<ExerciseCard model={model} {...h} />);
  expect(screen.getByText('12 reps')).toBeOnTheScreen();
  expect(screen.queryByRole('adjustable', { name: 'Load' })).toBeNull();
  expect(screen.getByRole('adjustable', { name: 'Reps' })).toBeOnTheScreen();
});

test('every chip has an Edit control that opens the set sheet, saved or not', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card()} {...h} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 1' }));
  expect(h.onOpenSheet).toHaveBeenCalledWith('full-body-back-squat:0');
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 2' }));
  expect(h.onOpenSheet).toHaveBeenLastCalledWith('full-body-back-squat:1');
});

test('a Failed Set is recorded neutrally in words, not color, and the Load Reset reason is shown', async () => {
  const h = handlers();
  const model = card({
    reasonLine: 'Reset after 2 sessions under 6 reps',
    chips: [chip({ setId: 's', saveState: 'saved', reps: 5, failedSet: true, accessibilityLabel: '80 kilograms, 5 reps, recommended, saved' })],
  });
  await render(<ExerciseCard model={model} {...h} />);
  expect(screen.getByText('Failed Set')).toBeOnTheScreen();
  expect(screen.getByText('Reset after 2 sessions under 6 reps')).toBeOnTheScreen();
  expect(screen.queryByText(/fail(ed)? (to|again)|missed|bad/i)).toBeNull();
});

test('a completed exercise says Done in words', async () => {
  const h = handlers();
  await render(<ExerciseCard model={card({ expanded: false, complete: true, progressText: '3 of 3 sets' })} {...h} />);
  expect(screen.getByText('✓ Done')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Back Squat, 3 × 6–10, 3 of 3 sets, done' })).toBeOnTheScreen();
});

test('History opens the exercise across every template, and only when the host offers it', async () => {
  const h = handlers();
  const view = await render(<ExerciseCard model={card()} {...h} />);
  expect(screen.queryByRole('button', { name: 'Back Squat history' })).toBeNull();
  const onOpenHistory = jest.fn();
  await view.rerender(<ExerciseCard model={card()} {...h} onOpenHistory={onOpenHistory} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Back Squat history' }));
  expect(onOpenHistory).toHaveBeenCalledWith('back-squat');
});

test('the next chip carries a stable testID for UI flows; other chips are keyed', async () => {
  await render(<ExerciseCard model={card()} {...handlers()} />);
  expect(screen.getByTestId('next-set-chip')).toHaveProp('accessibilityLabel', '80 kilograms, 9 reps, recommended');
  expect(screen.getByTestId('set-chip-full-body-back-squat:0')).toBeOnTheScreen();
});
