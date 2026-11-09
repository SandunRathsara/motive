import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { SessionSummaryViewModel } from '@/features/workouts';
import { summaryContent } from '@/components/organisms/__fixtures__/summary';
import { SessionSummaryTemplate } from './SessionSummaryTemplate';

beforeEach(() => { jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); });

const props = (model: SessionSummaryViewModel, extra: Partial<Parameters<typeof SessionSummaryTemplate>[0]> = {}) => ({
  model, undo: { offer: null, onUndo: jest.fn() }, onDone: jest.fn(), onEditSets: jest.fn(), onDeleteSession: jest.fn(), ...extra,
});

test('renders the summary with Done as the one primary action, pinned below the content', async () => {
  const p = props({ status: 'ready', ...summaryContent() });
  await render(<SessionSummaryTemplate {...p} />);
  expect(screen.getByText('4,320 kg')).toBeOnTheScreen();
  expect(screen.getByText('Bench moves to 82.5 × 6; Row repeats 60 kg after 1 Failed Set')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(p.onDone).toHaveBeenCalledTimes(1);
});

test('sets can be corrected afterwards (G9) and the session deleted in one tap with no dialog', async () => {
  const p = props({ status: 'ready', ...summaryContent() });
  await render(<SessionSummaryTemplate {...p} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Edit sets' }));
  expect(p.onEditSets).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete session' }));
  expect(p.onDeleteSession).toHaveBeenCalledTimes(1);
  expect(screen.queryByText(/sure|confirm/i)).toBeNull();
});

test('the undo toast for a deleted session is announced and undoes in one tap', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
  const p = props({ status: 'ready', ...summaryContent() }, {
    undo: { offer: { label: 'Session deleted', accessibilityLabel: 'Undo. Session deleted', deadlineMs: 5_000 }, onUndo: jest.fn() },
  });
  await render(<SessionSummaryTemplate {...p} />);
  expect(announce).toHaveBeenCalledWith('Session deleted. Undo available.');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo. Session deleted' }));
  expect(p.undo.onUndo).toHaveBeenCalledTimes(1);
});

test('loading, error, and missing sessions are deliberate states', async () => {
  const retry = jest.fn();
  const view = await render(<SessionSummaryTemplate {...props({ status: 'loading' })} />);
  expect(screen.getByText('Loading your summary…')).toBeOnTheScreen();
  await view.rerender(<SessionSummaryTemplate {...props({ status: 'error', retry })} />);
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn’t read your summary. Nothing was changed.");
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalledTimes(1);
  const missing = props({ status: 'missing' });
  await view.rerender(<SessionSummaryTemplate {...missing} />);
  expect(screen.getByText('This session no longer exists.')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Edit sets' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(missing.onDone).toHaveBeenCalledTimes(1);
});

test('a failed delete says nothing was changed', async () => {
  const p = props({ status: 'ready', ...summaryContent() }, { errorText: 'Not saved. Nothing was changed. Try again.' });
  await render(<SessionSummaryTemplate {...p} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Not saved. Nothing was changed. Try again.');
});
