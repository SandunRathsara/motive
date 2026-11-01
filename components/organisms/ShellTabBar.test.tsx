import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ShellTabBar } from './ShellTabBar';

test('names all four tabs, exposes selection, and switches on press', async () => {
  const names = ['Today', 'Train', 'Fuel', 'Coach'];
  const navigateToTab = jest.fn();
  const props = {
    state: { index: 0, routes: names.map((name) => ({ key: name, name })) },
    descriptors: Object.fromEntries(names.map((name) => [name, { options: { title: name } }])),
    emitter: { emit: () => ({ defaultPrevented: false }) },
    navigateToTab,
  } as unknown as BottomTabBarProps;

  await render(<ShellTabBar {...props} />);
  for (const name of names) {
    expect(screen.getByRole('tab', { name, selected: name === 'Today' })).toBeOnTheScreen();
  }
  await fireEvent.press(screen.getByRole('tab', { name: 'Fuel' }));
  expect(navigateToTab).toHaveBeenCalledWith('Fuel');
});
