import { render, screen } from '@testing-library/react-native';
import { StartingPlanPreview } from './StartingPlanPreview';

const plan = { kcalText: '1500', proteinText: '144 g', fatText: '48 g', clampText: null as string | null, programName: 'Full Body', exercises: [{ id: 'squat', name: 'Back Squat', prescription: '3 × 6–10' }] };
test('starting plan labels one kcal estimate, protein floor, unenforced fat minimum and starter prescriptions', async () => {
  await render(<StartingPlanPreview plan={plan} />);
  for (const text of ['1500', 'starting estimate', 'Protein floor · 144 g', 'Fat minimum · 48 g · for reference, not enforced', 'Back Squat', '3 × 6–10']) expect(screen.getByText(text)).toBeOnTheScreen();
  expect(screen.queryByRole('alert')).toBeNull();
});
test.each([
  'Your target is capped at your floor. This rate isn’t reachable at your floor. Try the slower -0.5% per week preset.',
  'Your target is capped at your floor. This rate isn’t reachable at your floor.',
])('clamp notice is visible and announced without inventing a missing rate: %s', async (clampText) => {
  await render(<StartingPlanPreview plan={{ ...plan, clampText }} />);
  expect(screen.getByRole('alert')).toHaveTextContent(clampText);
});
