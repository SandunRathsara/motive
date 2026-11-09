import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ShowMoreList } from './ShowMoreList';

const rows = (count: number) => Array.from({ length: count }, (_, index) => <Text key={index}>Row {index + 1}</Text>);

test('shows everything when it fits the limit, with no toggle', async () => {
  await render(<ShowMoreList limit={5} noun="sessions">{rows(5)}</ShowMoreList>);
  expect(screen.getAllByText(/^Row/)).toHaveLength(5);
  expect(screen.queryByRole('button')).toBeNull();
});

test('caps the visible rows and reveals the rest on request (UX-11)', async () => {
  await render(<ShowMoreList limit={5} noun="sessions">{rows(8)}</ShowMoreList>);
  expect(screen.getAllByText(/^Row/)).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: 'Show all 8 sessions' }));
  expect(screen.getAllByText(/^Row/)).toHaveLength(8);
  await fireEvent.press(screen.getByRole('button', { name: 'Show fewer sessions' }));
  expect(screen.getAllByText(/^Row/)).toHaveLength(5);
});

test('the toggle announces whether the list is expanded', async () => {
  await render(<ShowMoreList limit={2} noun="templates">{rows(3)}</ShowMoreList>);
  expect(screen.getByRole('button', { name: 'Show all 3 templates' })).toHaveProp('accessibilityState', { expanded: false });
  await fireEvent.press(screen.getByRole('button', { name: 'Show all 3 templates' }));
  expect(screen.getByRole('button', { name: 'Show fewer templates' })).toHaveProp('accessibilityState', { expanded: true });
});
