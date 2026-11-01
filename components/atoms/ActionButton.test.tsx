import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionButton } from './ActionButton';

test.each(['primary', 'secondary', 'destructive'] as const)('%s button is accessible and respects disabled state', async (variant) => {
  const onPress = jest.fn();
  await render(<ActionButton label="Continue" variant={variant} onPress={onPress} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(onPress).toHaveBeenCalledTimes(1);
  await screen.rerender(<ActionButton label="Continue" accessibilityLabel="Confirm action" variant={variant} disabled onPress={onPress} />);
  const button = screen.getByRole('button', { name: 'Confirm action' });
  expect(button).toBeDisabled();
  await fireEvent.press(button);
  expect(onPress).toHaveBeenCalledTimes(1);
});
