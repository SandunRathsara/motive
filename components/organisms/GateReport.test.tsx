import { fireEvent, render, screen } from '@testing-library/react-native';
import type { GateReportViewModel } from '@/features/data';
import { GateReport } from './GateReport';

function model(overrides: Partial<GateReportViewModel> = {}): GateReportViewModel {
  return {
    status: 'ready', report: { groups: [], builds: [], uncleanExitCount: 0, dailyTotals: [], skippedCount: 0 },
    builds: [], selectedBuild: null, selectBuild: jest.fn(), retry: jest.fn(), ...overrides,
  };
}

test('empty report explains that no metrics have been recorded', async () => {
  await render(<GateReport model={model()} />);
  expect(screen.getByText('No metrics recorded yet.')).toBeOnTheScreen();
  expect(screen.getByText('Unclean exits: 0')).toBeOnTheScreen();
  expect(screen.getByText('Unclean exits are crash evidence, not user force-quits.')).toBeOnTheScreen();
  expect(screen.queryByText(/skipped/)).toBeNull();
});

test('sparse durations are unknown, never zero, with counts and recognition-only p95', async () => {
  await render(<GateReport model={model({ report: {
    groups: [
      { eventType: 'food_active_input', count: 2, medianMs: null, p90Ms: null },
      { eventType: 'recognition_wait', count: 0, medianMs: null, p90Ms: null, p95Ms: null },
    ], builds: [], uncleanExitCount: 0, dailyTotals: [], skippedCount: 0,
  } })} />);
  expect(screen.getByRole('header', { name: 'Food active input time' })).toBeOnTheScreen();
  expect(screen.getByText('Count: 2')).toBeOnTheScreen();
  expect(screen.getByText('Count: 0')).toBeOnTheScreen();
  expect(screen.getAllByText('Median: —')).toHaveLength(2);
  expect(screen.getAllByText('p90: —')).toHaveLength(2);
  expect(screen.getAllByText('p95: —')).toHaveLength(1);
  expect(screen.queryByText(/0\.0 s/)).toBeNull();
});

test('populated report formats seconds, unknown types, crash count, daily totals and build filters', async () => {
  const builds = [{ build: '1.0.0+1', count: 5 }, { build: '1.0.0+2', count: 8 }];
  const props = model({ builds, report: {
    groups: [
      { eventType: 'food_active_input', count: 5, medianMs: 4200, p90Ms: 10000 },
      { eventType: 'recognition_wait', count: 6, medianMs: 8000, p90Ms: 15000, p95Ms: 20000 },
      { eventType: 'set_logging', count: 5, medianMs: 3000, p90Ms: 5000 },
      { eventType: 'future_event', count: 5, medianMs: 2000, p90Ms: 2500 },
      { eventType: 'unclean_exit', count: 2, medianMs: null, p90Ms: null },
    ], builds, uncleanExitCount: 2, dailyTotals: [{ day: '2026-11-08', count: 4, totalMs: 37500 }], skippedCount: 2,
  } });
  await render(<GateReport model={props} />);
  expect(screen.getByText('Median: 4.2 s')).toBeOnTheScreen();
  expect(screen.getByText('p90: 10.0 s')).toBeOnTheScreen();
  expect(screen.getAllByText(/p95:/)).toHaveLength(1);
  expect(screen.getByText('p95: 20.0 s')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Set logging time' })).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'future_event' })).toBeOnTheScreen();
  expect(screen.getByText('Unclean exits: 2')).toBeOnTheScreen();
  expect(screen.getByText('2026-11-08 · 37.5 s · 4 inputs')).toBeOnTheScreen();
  expect(screen.getByText('2 rows couldn’t be read and were skipped.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'All builds', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '1.0.0+2 · 8 samples' }));
  expect(props.selectBuild).toHaveBeenCalledWith('1.0.0+2');
  await screen.rerender(<GateReport model={{ ...props, selectedBuild: '1.0.0+2' }} />);
  expect(screen.getByRole('button', { name: '1.0.0+2 · 8 samples', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'All builds' }));
  expect(props.selectBuild).toHaveBeenLastCalledWith(null);
});

test('loading and failure are not mistaken for an empty report, and failure can retry', async () => {
  await render(<GateReport model={model({ status: 'loading', report: null })} />);
  expect(screen.getByText('Loading report…')).toBeOnTheScreen();
  expect(screen.queryByText('No metrics recorded yet.')).toBeNull();
  expect(screen.queryByText('Unclean exits: 0')).toBeNull();
  const props = model({ status: 'error', report: null });
  await screen.rerender(<GateReport model={props} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t load the report. Try again.');
  expect(screen.queryByText('No metrics recorded yet.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(props.retry).toHaveBeenCalledTimes(1);
});

test('a refresh failure remains visible alongside a cached report', async () => {
  const props = model({ status: 'error' });
  await render(<GateReport model={props} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t refresh the report. Showing the last loaded report.');
  expect(screen.getByText('Unclean exits: 0')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(props.retry).toHaveBeenCalledTimes(1);
});
