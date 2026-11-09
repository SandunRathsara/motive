import { render, screen } from '@testing-library/react-native';
import { SessionSummary } from './SessionSummary';
import { summaryContent } from './__fixtures__/summary';

test('shows volume, sets, sets per muscle group, the comparison and the deterministic next-time line', async () => {
  await render(<SessionSummary content={summaryContent()} />);
  expect(screen.getByRole('header', { name: 'Full Body' })).toBeOnTheScreen();
  expect(screen.getByText('Mon 9 Nov · 52 min')).toBeOnTheScreen();
  expect(screen.getByRole('summary', { name: 'Volume' })).toHaveProp('accessibilityValue', { text: '4,320 kg' });
  expect(screen.getByText('4,320 kg')).toBeOnTheScreen();
  expect(screen.getByText('14 working sets')).toBeOnTheScreen();
  expect(screen.getByText('Chest · 3 sets')).toBeOnTheScreen();
  expect(screen.getByText('Quadriceps · 3 sets')).toBeOnTheScreen();
  expect(screen.getByText('+240 kg vs Full Body on Fri 6 Nov')).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: 'Next time' })).toBeOnTheScreen();
  expect(screen.getByText('Bench moves to 82.5 × 6; Row repeats 60 kg after 1 Failed Set')).toBeOnTheScreen();
  expect(screen.getByText('Counts toward your weekly target')).toBeOnTheScreen();
});

test('shows a bodyweight reps total beside volume, and a linked Health workout as context', async () => {
  await render(<SessionSummary content={summaryContent({
    bodyweightRepsText: '36 bodyweight reps', linkedWorkoutText: 'Linked: Traditional strength training · 52 min',
  })} />);
  expect(screen.getByText('36 bodyweight reps')).toBeOnTheScreen();
  expect(screen.getByText('Linked: Traditional strength training · 52 min')).toBeOnTheScreen();
});

test('omits what does not exist: no comparison on a first session, no next-time line, no duration while active', async () => {
  await render(<SessionSummary content={summaryContent({ comparison: null, nextTimeLine: null, durationText: null })} />);
  expect(screen.getByText('Mon 9 Nov')).toBeOnTheScreen();
  expect(screen.queryByText(/vs /)).toBeNull();
  expect(screen.queryByRole('header', { name: 'Next time' })).toBeNull();
  expect(screen.queryByText(/min$/)).toBeNull();
});

test('a session with no loaded working sets shows a dash, never a made-up zero', async () => {
  await render(<SessionSummary content={summaryContent({
    volumeText: '—', setsText: '0 working sets', muscleGroups: [], comparison: null, nextTimeLine: null,
    counts: false, countsText: 'No working sets, so this session does not count',
  })} />);
  expect(screen.getByText('—')).toBeOnTheScreen();
  expect(screen.queryByText(/^0 kg$/)).toBeNull();
  expect(screen.queryByText('Sets by muscle group')).toBeNull();
  expect(screen.getByText('No working sets, so this session does not count')).toBeOnTheScreen();
});

test('a comparison that went down or stayed the same is stated in words and signs, neutrally', async () => {
  const view = await render(<SessionSummary content={summaryContent({ comparison: { text: '−120 kg vs Full Body on Fri 6 Nov', direction: 'down' } })} />);
  expect(screen.getByText('−120 kg vs Full Body on Fri 6 Nov')).toBeOnTheScreen();
  await view.rerender(<SessionSummary content={summaryContent({ comparison: { text: 'Same as Full Body on Fri 6 Nov', direction: 'same' } })} />);
  expect(screen.getByText('Same as Full Body on Fri 6 Nov')).toBeOnTheScreen();
});
