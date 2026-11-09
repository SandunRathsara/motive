import { render, screen } from '@testing-library/react-native';
import { SegmentedProgress } from './SegmentedProgress';

test('announces progress as a spoken value, not only a bar', async () => {
  await render(<SegmentedProgress label="Weekly sessions" completed={2} total={3} valueText="2 of 3 sessions" />);
  const bar = screen.getByRole('progressbar', { name: 'Weekly sessions' });
  expect(bar).toHaveProp('accessibilityValue', { min: 0, max: 3, now: 2, text: '2 of 3 sessions' });
});

test('completed beyond the total is capped at the total', async () => {
  await render(<SegmentedProgress label="Over" completed={5} total={3} valueText="5 of 3 sessions" />);
  expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveProp('accessibilityValue', { min: 0, max: 3, now: 3, text: '5 of 3 sessions' });
});

test('renders one segment per session, filled for each completed one', async () => {
  await render(<SegmentedProgress label="Week" completed={1} total={4} valueText="1 of 4 sessions" />);
  expect(screen.getAllByTestId('progress-segment-filled')).toHaveLength(1);
  expect(screen.getAllByTestId('progress-segment-empty')).toHaveLength(3);
});

test('an empty bar is valid', async () => {
  await render(<SegmentedProgress label="None" completed={0} total={3} valueText="0 of 3 sessions" />);
  expect(screen.getByRole('progressbar', { name: 'None' })).toHaveProp('accessibilityValue', { min: 0, max: 3, now: 0, text: '0 of 3 sessions' });
  expect(screen.queryAllByTestId('progress-segment-filled')).toHaveLength(0);
});
