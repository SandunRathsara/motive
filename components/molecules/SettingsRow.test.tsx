import { fireEvent, render, screen } from '@testing-library/react-native';
import { SettingsRow } from './SettingsRow';

test('rows expose their value, hint, selection and disabled state', async () => {
  const onPress = jest.fn();
  await render(<SettingsRow label="About" value="1.0.0" detail="Installed build" navigation
    accessibilityHint="Opens build information" onPress={onPress} />);
  const row = screen.getByRole('button', { name: 'About' });
  expect(row).toHaveAccessibilityValue({ text: '1.0.0' });
  expect(row).toHaveProp('accessibilityHint', 'Opens build information');
  expect(screen.getByText('Installed build')).toBeOnTheScreen();
  await fireEvent.press(row);
  expect(onPress).toHaveBeenCalledTimes(1);
  await screen.rerender(<SettingsRow label="About" onPress={onPress} disabled selected />);
  expect(screen.getByRole('button', { name: 'About', selected: true })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'About' }));
  expect(onPress).toHaveBeenCalledTimes(1);
});
