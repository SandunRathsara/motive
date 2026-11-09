import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { ActiveSessionViewModel } from '@/features/workouts';
import { actions as makeActions, content, sheetModel } from '@/components/organisms/__fixtures__/session';
import { ActiveSessionTemplate } from './ActiveSessionTemplate';

beforeEach(() => { jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); });

const noUndo = { offer: null, onUndo: jest.fn() };
const setup = (model: ActiveSessionViewModel, extra: Partial<Parameters<typeof ActiveSessionTemplate>[0]> = {}) => {
  const actions = makeActions();
  const props = { model, actions, sheet: () => sheetModel(), undo: noUndo, now: () => 1_000_000 + 754_000, onFinish: jest.fn(), onDone: jest.fn(), onDeleteSession: jest.fn(), ...extra };
  return { actions, props, element: <ActiveSessionTemplate {...props} /> };
};

test('shows the template, progress, elapsed timer and the docked exercise; Finish is the one primary action', async () => {
  const { element, props } = setup({ status: 'ready', ...content() });
  await render(element);
  expect(screen.getByRole('header', { name: 'Full Body' })).toBeOnTheScreen();
  expect(screen.getByText('1 of 6 sets')).toBeOnTheScreen();
  expect(screen.getByRole('timer', { name: 'Elapsed time' })).toHaveProp('accessibilityValue', { text: '12 minutes 34 seconds' });
  expect(screen.getByTestId('current-exercise')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Finish session' }));
  expect(props.onFinish).toHaveBeenCalledTimes(1);
});

test('the rest bar appears after a set is saved with +30 s and Skip, and never blocks logging', async () => {
  const rest = { deadlineMs: 1_754_000 + 90_000, durationSeconds: 90 };
  const { element, actions } = setup({ status: 'ready', ...content({ rest }) });
  const { toJSON } = await render(element);
  expect(screen.getByRole('timer', { name: 'Rest' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Add 30 seconds' }));
  expect(actions.addThirtySeconds).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Skip rest' }));
  expect(actions.skipRest).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(toJSON())).not.toContain('"Modal"');
  await fireEvent.press(screen.getAllByRole('button', { name: '80 kilograms, 9 reps, recommended' })[0]);
  expect(actions.logChip).toHaveBeenCalledTimes(1);
});

test('no rest bar when nothing is resting', async () => {
  const { element } = setup({ status: 'ready', ...content({ rest: null }) });
  await render(element);
  expect(screen.queryByRole('timer', { name: 'Rest' })).toBeNull();
});

test('the undo toast sits with the bottom controls and undoes in one tap', async () => {
  const onUndo = jest.fn();
  const { element } = setup({ status: 'ready', ...content() }, {
    undo: { offer: { label: 'Set logged', accessibilityLabel: 'Undo. Set logged', deadlineMs: 5_000 }, onUndo },
  });
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Undo. Set logged' }));
  expect(onUndo).toHaveBeenCalledTimes(1);
});

test('a deload session says so in words', async () => {
  const { element } = setup({ status: 'ready', ...content({ deload: true }) });
  await render(element);
  expect(screen.getByText('Deload session')).toBeOnTheScreen();
});

test('correcting a finished session (G9) has no timer, rest bar or Finish, and Done leaves', async () => {
  const { element, props } = setup({ status: 'ready', ...content({ active: false, rest: null }) });
  await render(element);
  expect(screen.getByText('Finished session')).toBeOnTheScreen();
  expect(screen.queryByRole('timer', { name: 'Elapsed time' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Finish session' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(props.onDone).toHaveBeenCalledTimes(1);
});

test('delete session is one tap with no dialog; the undo toast is the safety net', async () => {
  const { element, props } = setup({ status: 'ready', ...content() });
  await render(element);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete session' }));
  expect(props.onDeleteSession).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/sure|confirm/i)).toBeNull();
});

test('loading and error states are deliberate; retry is offered', async () => {
  const retry = jest.fn();
  const { element } = setup({ status: 'loading' });
  const view = await render(element);
  expect(screen.getByText('Loading your session…')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Finish session' })).toBeNull();
  await view.rerender(<ActiveSessionTemplate {...setup({ status: 'error', retry }).props} />);
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn’t read your session. Nothing was changed.");
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test('a failed finish is reported calmly and the session stays open', async () => {
  const { element } = setup({ status: 'ready', ...content() }, { errorText: 'Not saved. Nothing was changed. Try again.' });
  await render(element);
  expect(screen.getByRole('alert')).toHaveTextContent('Not saved. Nothing was changed. Try again.');
  expect(screen.getByRole('button', { name: 'Finish session' })).toBeEnabled();
});
