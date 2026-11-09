import { undoWindow, undoWindowMs } from './workouts.undo';

beforeEach(() => { jest.useFakeTimers(); undoWindow.clear(); });
afterEach(() => { undoWindow.clear(); jest.useRealTimers(); });

test('an offer lasts 5 s from now, then disappears', () => {
  const now = Date.now();
  const offer = undoWindow.offer({ kind: 'deleteSet', setId: 'a' }, 'Set logged', now);
  expect(offer).toMatchObject({ label: 'Set logged', accessibilityLabel: 'Undo. Set logged', deadlineMs: now + undoWindowMs });
  expect(undoWindow.get()).toBe(offer);
  jest.advanceTimersByTime(undoWindowMs - 1);
  expect(undoWindow.get()).toBe(offer);
  jest.advanceTimersByTime(2);
  expect(undoWindow.get()).toBeNull();
});

test('a newer offer replaces the older one and its timer', () => {
  undoWindow.offer({ kind: 'deleteSet', setId: 'a' }, 'Set logged');
  jest.advanceTimersByTime(3_000);
  const second = undoWindow.offer({ kind: 'deleteSet', setId: 'b' }, 'Set logged');
  jest.advanceTimersByTime(3_000);
  expect(undoWindow.get()).toBe(second);
});

test('subscribers hear every change and can unsubscribe', () => {
  const listener = jest.fn();
  const stop = undoWindow.subscribe(listener);
  undoWindow.offer({ kind: 'deleteSet', setId: 'a' }, 'Set logged');
  undoWindow.clear();
  expect(listener).toHaveBeenCalledTimes(2);
  stop();
  undoWindow.offer({ kind: 'deleteSet', setId: 'b' }, 'x');
  expect(listener).toHaveBeenCalledTimes(2);
});
