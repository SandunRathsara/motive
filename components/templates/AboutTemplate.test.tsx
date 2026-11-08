import { render, screen } from '@testing-library/react-native';
import { AboutTemplate } from './AboutTemplate';

test('credits USDA FoodData Central and identifies the installed build and tag', async () => {
  await render(<AboutTemplate identity={{ version: '1.2.3', buildNumber: '42', buildId: '1.2.3+42', gitTag: 'build/owner/1.2.3+42' }} />);
  expect(screen.getByText('Food data: USDA FoodData Central')).toBeOnTheScreen();
  expect(screen.getByText('Version: 1.2.3')).toBeOnTheScreen();
  expect(screen.getByText('Build number: 42')).toBeOnTheScreen();
  expect(screen.getByText('Build ID: 1.2.3+42')).toBeOnTheScreen();
  expect(screen.getByText('Git tag: build/owner/1.2.3+42')).toBeOnTheScreen();
  await screen.rerender(<AboutTemplate identity={{ version: '0.0.0', buildNumber: 'dev', buildId: '0.0.0+dev', gitTag: null }} />);
  expect(screen.getByText('Untagged development build')).toBeOnTheScreen();
});
