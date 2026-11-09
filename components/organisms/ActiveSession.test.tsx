import { ScrollView, type ScrollViewInstance } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActiveSession } from './ActiveSession';
import { actions as makeActions, card, chip, content, sheetModel } from './__fixtures__/session';

const setup = (overrides: Parameters<typeof content>[0] = {}, sheet: Parameters<typeof sheetModel>[0] | null = {}) => {
  const actions = makeActions();
  const sheetFor = jest.fn(() => (sheet === null ? null : sheetModel(sheet)));
  return { actions, sheetFor, element: <ActiveSession content={content(overrides)} actions={actions} sheet={sheetFor} /> };
};

test('the expanded exercise is docked with its chips; the other exercises wait above as collapsed rows', async () => {
  const { element, actions } = setup();
  await render(element);
  expect(screen.getByTestId('current-exercise')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Back Squat, 3 × 6–10, 1 of 3 sets' })).toBeOnTheScreen();
  expect(screen.getByText('Set 2')).toBeOnTheScreen();
  const bench = screen.getByRole('button', { name: 'Bench Press, 3 × 6–10, 0 of 3 sets' });
  expect(screen.queryByTestId('current-exercise')).toHaveTextContent(/Back Squat/);
  expect(screen.getByTestId('current-exercise')).not.toHaveTextContent(/Bench Press/);
  await fireEvent.press(bench);
  expect(actions.expand).toHaveBeenCalledWith('full-body-bench-press');
});

test('tapping the docked exercise header collapses it', async () => {
  const { element, actions } = setup();
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Back Squat, 3 × 6–10, 1 of 3 sets' }));
  expect(actions.expand).toHaveBeenCalledWith(null);
});

test('with nothing expanded, every exercise is a collapsed row and nothing is docked', async () => {
  const base = content();
  const { element } = setup({ exercises: base.exercises.map((exercise) => ({ ...exercise, expanded: false })) });
  await render(element);
  expect(screen.queryByTestId('current-exercise')).toBeNull();
  expect(screen.getByRole('button', { name: /^Back Squat/ })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: /^Bench Press/ })).toBeOnTheScreen();
});

test('one tap on a chip logs it; stepper changes adjust the draft', async () => {
  const { element, actions } = setup();
  await render(element);
  await fireEvent.press(screen.getAllByRole('button', { name: '80 kilograms, 9 reps, recommended' })[0]);
  expect(actions.logChip).toHaveBeenCalledWith('full-body-back-squat:1');
  await fireEvent.press(screen.getByRole('button', { name: 'Increase reps by 1 rep' }));
  expect(actions.adjust).toHaveBeenCalledWith('full-body-back-squat:1', { reps: 10 });
});

// The rest bar shrinks the docked panel after a log, which pushed the next chip out of view (found on the
// simulator: the next chip sat under the rest bar). The panel follows the focus chip so it is always one tap away.
const layout = (y: number) => ({ nativeEvent: { layout: { x: 0, y, width: 340, height: 70 } } });

test('the docked exercise scrolls to the next chip, so it stays in view and one tap away', async () => {
  await render(<ActiveSession content={content()} actions={makeActions()} sheet={() => null} onOpenHistory={jest.fn()} />);
  // The React Native jest mock shares one jest.fn `scrollTo` across ScrollView instances.
  const scrollTo = jest.mocked((ScrollView as unknown as { prototype: ScrollViewInstance }).prototype.scrollTo);
  scrollTo.mockClear();
  // Body of the card starts 64 below its top; the focus chip's block starts 120 into the body.
  await fireEvent(screen.getByRole('button', { name: 'Back Squat history' }), 'layout', layout(64));
  await fireEvent(screen.getByTestId('next-set-chip'), 'layout', layout(120));
  expect(scrollTo).toHaveBeenLastCalledWith({ y: 184, animated: false });
});

test('any touch on the session is reported so the set timer can start after rest', async () => {
  const { element, actions } = setup();
  await render(element);
  await fireEvent(screen.getByTestId('active-session'), 'touchStart');
  expect(actions.touch).toHaveBeenCalledTimes(1);
});

test('Edit opens the set sheet without blocking the session behind it', async () => {
  const { element, sheetFor, actions } = setup();
  await render(element);
  expect(screen.queryByRole('header', { name: 'Back Squat · Set 2' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 2' }));
  expect(sheetFor).toHaveBeenCalledWith('full-body-back-squat:1');
  expect(screen.getByRole('header', { name: 'Back Squat · Set 2' })).toBeOnTheScreen();
  // Still interactive behind the sheet: a chip logs while it is open.
  await fireEvent.press(screen.getAllByRole('button', { name: '80 kilograms, 9 reps, recommended' })[0]);
  expect(actions.logChip).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('header', { name: 'Back Squat · Set 2' })).toBeOnTheScreen();
});

test('logging from the sheet commits one set with the sheet values, then closes it', async () => {
  const { element, actions } = setup();
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 2' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(actions.logSet).toHaveBeenCalledTimes(1);
  expect(actions.logSet).toHaveBeenCalledWith({ templateExerciseId: 'full-body-back-squat', type: 'working', loadKg: 82.5, reps: 9 });
  expect(screen.queryByRole('header', { name: 'Back Squat · Set 2' })).toBeNull();
});

test('editing a saved set from the sheet is one edit, and deleting it is one tap', async () => {
  const saved = { setId: 'set-1', isSaved: true, canDelete: true, chipKey: 'full-body-back-squat:0', title: 'Back Squat · Set 1' };
  const { element, actions } = setup({}, saved);
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 1' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase reps by 1 rep' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Increase reps by 1 rep' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(actions.editSet).toHaveBeenCalledTimes(1);
  expect(actions.editSet).toHaveBeenCalledWith('set-1', { loadKg: 80, reps: 11, type: 'working' });
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 1' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete set' }));
  expect(actions.deleteSet).toHaveBeenCalledWith('set-1');
  expect(screen.queryByRole('header', { name: 'Back Squat · Set 1' })).toBeNull();
});

test('a failed commit keeps the sheet open and says nothing was saved', async () => {
  const actions = makeActions({ logSet: jest.fn(async () => false) });
  await render(<ActiveSession content={content()} actions={actions} sheet={() => sheetModel()} errorText="Not saved. Nothing was changed. Try again." />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 2' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Log set' }));
  expect(screen.getByRole('header', { name: 'Back Squat · Set 2' })).toBeOnTheScreen();
  expect(screen.getByRole('alert')).toHaveTextContent('Not saved. Nothing was changed. Try again.');
});

test('a long-press on a card stepper opens the sheet straight into direct entry', async () => {
  const { element } = setup();
  await render(element);
  await fireEvent(screen.getAllByRole('adjustable', { name: 'Load' })[0], 'longPress');
  expect(screen.getByLabelText('Load in kilograms')).toBeOnTheScreen();
});

test('expanding another exercise closes the sheet', async () => {
  const { element } = setup();
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Set 2' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Bench Press, 3 × 6–10, 0 of 3 sets' }));
  expect(screen.queryByRole('header', { name: 'Back Squat · Set 2' })).toBeNull();
});

test('the screen has no modal and shows a first-session chip that needs a load', async () => {
  const first = card({
    firstSession: true,
    chips: [chip({ key: 'k:0', loadKg: null, reps: 6, recommended: false, last: null, needsLoad: true, accessibilityLabel: 'Load not set, 6 reps' })],
  });
  const { element } = setup({ exercises: [first] });
  const { toJSON } = await render(element);
  expect(JSON.stringify(toJSON())).not.toContain('"Modal"');
  expect(screen.getByRole('button', { name: 'Load not set, 6 reps' })).toBeDisabled();
});
