import { fireEvent, render, screen } from '@testing-library/react-native';
import { CountStepper } from './CountStepper';

test('steps by the given amount and reports the new value', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Sets" value={3} unit="set" unitPlural="sets" step={1} min={1} max={10} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase sets by 1 set' }));
  expect(onChange).toHaveBeenLastCalledWith(4);
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease sets by 1 set' }));
  expect(onChange).toHaveBeenLastCalledWith(2);
});

test('does not go below the minimum or above the maximum', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Sets" value={1} unit="set" unitPlural="sets" step={1} min={1} max={1} onChange={onChange} />);
  expect(screen.getByRole('button', { name: 'Decrease sets by 1 set' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Increase sets by 1 set' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease sets by 1 set' }));
  expect(onChange).not.toHaveBeenCalled();
});

test('fractional steps do not accumulate floating-point error', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Increment" value={0.2} unit="kg" step={0.1} min={0} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase increment by 0.1 kg' }));
  expect(onChange).toHaveBeenLastCalledWith(0.3);
});

test('a step is clamped to the bounds', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Rest" value={20} unit="s" step={15} min={15} onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease rest by 15 s' }));
  expect(onChange).toHaveBeenLastCalledWith(15);
});

test('the value is adjustable for VoiceOver with a spoken value', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Sets" value={3} unit="set" unitPlural="sets" step={1} min={1} max={10} onChange={onChange} />);
  const value = screen.getByRole('adjustable', { name: 'Sets' });
  expect(value).toHaveProp('accessibilityValue', { text: '3 sets' });
  await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onChange).toHaveBeenLastCalledWith(4);
  await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onChange).toHaveBeenLastCalledWith(2);
});

test('shows the formatted value and unit; a unit counted once is singular', async () => {
  await render(<CountStepper label="Sets" value={1} unit="set" unitPlural="sets" step={1} onChange={jest.fn()} />);
  expect(screen.getByText('1')).toBeOnTheScreen();
  expect(screen.getByText('set')).toBeOnTheScreen();
});

test('a disabled stepper ignores presses', async () => {
  const onChange = jest.fn();
  await render(<CountStepper label="Sets" value={3} unit="set" unitPlural="sets" step={1} disabled onChange={onChange} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase sets by 1 set' }));
  expect(onChange).not.toHaveBeenCalled();
});

test('a custom display text replaces the number (e.g. "Default")', async () => {
  await render(<CountStepper label="Rest" value={90} unit="s" step={15} valueText="Default 90" onChange={jest.fn()} />);
  expect(screen.getByText('Default 90')).toBeOnTheScreen();
});
