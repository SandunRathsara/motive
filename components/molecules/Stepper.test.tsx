import { fireEvent, render, screen } from '@testing-library/react-native';
import { Stepper } from './Stepper';

test('load stepper moves by the exercise increment', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={80} step={2.5} onChange={onChange} onDirectEntry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  expect(onChange).toHaveBeenLastCalledWith(82.5);
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease load by 2.5 kilograms' }));
  expect(onChange).toHaveBeenLastCalledWith(77.5);
});

test('reps stepper moves by one', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Reps" unit="reps" value={9} step={1} onChange={onChange} onDirectEntry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase reps by 1 rep' }));
  expect(onChange).toHaveBeenLastCalledWith(10);
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease reps by 1 rep' }));
  expect(onChange).toHaveBeenLastCalledWith(8);
});

test('fractional increments do not accumulate floating-point error', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={0.2} step={0.1} onChange={onChange} onDirectEntry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 0.1 kilograms' }));
  expect(onChange).toHaveBeenLastCalledWith(0.3);
});

test('does not step below the minimum or above the maximum', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Reps" unit="reps" value={0} step={1} max={0} onChange={onChange} onDirectEntry={jest.fn()} />);
  const decrease = screen.getByRole('button', { name: 'Decrease reps by 1 rep' });
  const increase = screen.getByRole('button', { name: 'Increase reps by 1 rep' });
  expect(decrease).toBeDisabled();
  expect(increase).toBeDisabled();
  await fireEvent.press(decrease);
  await fireEvent.press(increase);
  expect(onChange).not.toHaveBeenCalled();
});

test('a step is clamped to the bounds', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={1} step={2.5} onChange={onChange} onDirectEntry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Decrease load by 2.5 kilograms' }));
  expect(onChange).toHaveBeenLastCalledWith(0);
});

test('long-pressing the value opens direct entry', async () => {
  const onDirectEntry = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={80} step={2.5} onChange={jest.fn()} onDirectEntry={onDirectEntry} />);
  await fireEvent(screen.getByRole('adjustable', { name: 'Load' }), 'longPress');
  expect(onDirectEntry).toHaveBeenCalledTimes(1);
});

test('the value is adjustable for VoiceOver with a spoken value', async () => {
  const onChange = jest.fn();
  const onDirectEntry = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={80} step={2.5} onChange={onChange} onDirectEntry={onDirectEntry} />);
  const value = screen.getByRole('adjustable', { name: 'Load' });
  expect(value).toHaveProp('accessibilityValue', { text: '80 kilograms' });
  expect(value).toHaveProp('accessibilityActions', [
    { name: 'increment' }, { name: 'decrement' }, { name: 'activate', label: 'Enter load' },
  ]);
  await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
  expect(onChange).toHaveBeenLastCalledWith(82.5);
  await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
  expect(onChange).toHaveBeenLastCalledWith(77.5);
  await fireEvent(value, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
  expect(onDirectEntry).toHaveBeenCalledTimes(1);
});

test('shows the formatted value with its unit', async () => {
  await render(<Stepper label="Load" unit="kg" value={82.5} step={2.5} onChange={jest.fn()} onDirectEntry={jest.fn()} />);
  expect(screen.getByText('82.5')).toBeOnTheScreen();
  expect(screen.getByText('kg')).toBeOnTheScreen();
});

test('disabled stepper ignores presses', async () => {
  const onChange = jest.fn();
  await render(<Stepper label="Load" unit="kg" value={80} step={2.5} disabled onChange={onChange} onDirectEntry={jest.fn()} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Increase load by 2.5 kilograms' }));
  expect(onChange).not.toHaveBeenCalled();
});
