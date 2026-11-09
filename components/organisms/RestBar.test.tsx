import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { RestBar } from './RestBar';

let clock = 0;
const now = () => clock;
const advance = async (ms: number) => {
  await act(async () => { clock += ms; jest.advanceTimersByTime(ms); });
};
const props = () => ({ durationSeconds: 90, now, onAddThirty: jest.fn(), onSkip: jest.fn(), onElapsed: jest.fn() });

beforeEach(() => { clock = 1_000_000; jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('counts down against the wall-clock deadline', async () => {
  await render(<RestBar deadlineMs={clock + 90_000} {...props()} />);
  expect(screen.getByText('1:30')).toBeOnTheScreen();
  expect(screen.getByRole('timer', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '1 minute 30 seconds remaining' });
  await advance(31_000);
  expect(screen.getByText('0:59')).toBeOnTheScreen();
  expect(screen.getByRole('timer', { name: 'Rest' })).toHaveProp('accessibilityValue', { text: '59 seconds remaining' });
});

test('time spent while the app was suspended is caught up from the clock', async () => {
  await render(<RestBar deadlineMs={clock + 90_000} {...props()} />);
  await advance(45_000); // clock jumps as if backgrounded, then one tick lands
  expect(screen.getByText('0:45')).toBeOnTheScreen();
});

test('+30 s and Skip call back and are accessible buttons', async () => {
  const p = props();
  await render(<RestBar deadlineMs={clock + 90_000} {...p} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add 30 seconds' }));
  expect(p.onAddThirty).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Skip rest' }));
  expect(p.onSkip).toHaveBeenCalledTimes(1);
});

test('a new deadline from +30 s extends the display', async () => {
  const p = props();
  await render(<RestBar deadlineMs={clock + 90_000} {...p} />);
  await advance(10_000);
  await screen.rerender(<RestBar deadlineMs={clock + 110_000} {...p} />);
  expect(screen.getByText('1:50')).toBeOnTheScreen();
});

test('reports the end of rest once, announces it and offers dismissal', async () => {
  const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  const p = props();
  await render(<RestBar deadlineMs={clock + 3_000} {...p} />);
  await advance(3_000);
  expect(screen.getByText('Rest over')).toBeOnTheScreen();
  await advance(5_000);
  expect(p.onElapsed).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith('Rest over');
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss rest' }));
  expect(p.onSkip).toHaveBeenCalledTimes(1);
});

test('a deadline already in the past shows rest over immediately', async () => {
  const p = props();
  await render(<RestBar deadlineMs={clock - 1} {...p} />);
  expect(screen.getByText('Rest over')).toBeOnTheScreen();
  expect(p.onElapsed).toHaveBeenCalledTimes(1);
});

test('is non-blocking: no modal and the logging UI beside it stays reachable', async () => {
  const { toJSON } = await render(<RestBar deadlineMs={clock + 90_000} {...props()} />);
  expect(JSON.stringify(toJSON())).not.toContain('Modal');
  expect(screen.queryByRole('alert')).toBeNull();
});

test('has no animation to reduce: progress is stepped segments updated by text-only ticks', async () => {
  await render(<RestBar deadlineMs={clock + 90_000} {...props()} />);
  expect(screen.getAllByTestId('rest-segment-filled', { hidden: true })).toHaveLength(10);
  await advance(45_000);
  expect(screen.getAllByTestId('rest-segment-filled', { hidden: true })).toHaveLength(5);
});
