import { Text } from 'react-native';
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
    const tab = screen.getByRole('tab', { name, selected: name === 'Today' });
    expect(tab).toBeOnTheScreen();
    // Capped label scaling is backed by the iOS Large Content Viewer.
    expect(tab).toHaveProp('accessibilityShowsLargeContentViewer', true);
    expect(tab).toHaveProp('accessibilityLargeContentTitle', name);
  }
  await fireEvent.press(screen.getByRole('tab', { name: 'Fuel' }));
  expect(navigateToTab).toHaveBeenCalledWith('Fuel');
});

test('each tab has a stable testID and an `above` slot renders over the tabs', async () => {
  const names = ['index', 'train'];
  const props = {
    state: { index: 0, routes: names.map((name) => ({ key: name, name })) },
    descriptors: Object.fromEntries(names.map((name) => [name, { options: { title: name } }])),
    emitter: { emit: () => ({ defaultPrevented: false }) },
    navigateToTab: jest.fn(),
  } as unknown as BottomTabBarProps;
  await render(<ShellTabBar {...props} above={<Text>Toast host</Text>} />);
  expect(screen.getByTestId('tab-train')).toBeOnTheScreen();
  expect(screen.getByText('Toast host')).toBeOnTheScreen();
});
