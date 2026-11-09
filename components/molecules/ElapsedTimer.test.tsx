import { act, render, screen } from '@testing-library/react-native';
import { ElapsedTimer } from './ElapsedTimer';

let clock = 0;
const now = () => clock;
const advance = async (ms: number) => {
  await act(async () => { clock += ms; jest.advanceTimersByTime(ms); });
};

beforeEach(() => { clock = 10_000_000; jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

test('shows the wall-clock time since the session started', async () => {
  await render(<ElapsedTimer startedAt={clock - 754_000} now={now} />);
  expect(screen.getByText('12:34')).toBeOnTheScreen();
  expect(screen.getByRole('timer', { name: 'Elapsed time' })).toHaveProp('accessibilityValue', { text: '12 minutes 34 seconds' });
  await advance(26_000);
  expect(screen.getByText('13:00')).toBeOnTheScreen();
});

test('shows hours once a session passes 60 minutes, and never goes negative', async () => {
  const view = await render(<ElapsedTimer startedAt={clock - 3_725_000} now={now} />);
  expect(screen.getByText('1:02:05')).toBeOnTheScreen();
  expect(screen.getByRole('timer', { name: 'Elapsed time' })).toHaveProp('accessibilityValue', { text: '1 hour 2 minutes 5 seconds' });
  await view.rerender(<ElapsedTimer startedAt={clock + 5_000} now={now} />);
  expect(screen.getByText('0:00')).toBeOnTheScreen();
});

test('a stopped timer stops ticking', async () => {
  await render(<ElapsedTimer startedAt={clock - 60_000} now={now} running={false} />);
  expect(screen.getByText('1:00')).toBeOnTheScreen();
  await advance(30_000);
  expect(screen.getByText('1:00')).toBeOnTheScreen();
});
