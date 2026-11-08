import { render, screen } from '@testing-library/react-native';
import { Sparkline } from './Sparkline';

test('unknown days are gaps, announced with known coverage instead of zero measurements', async () => {
  await render(<Sparkline label="Sleep" points={[
    { known: true, level: 2 }, { known: false }, { known: true, level: 5 },
  ]} />);
  expect(screen.getByRole('image', { name: 'Sleep, 14 days, 2 of 14 known. Unknown days are gaps.' })).toBeOnTheScreen();
  expect(screen.queryByText('0')).toBeNull();
});
