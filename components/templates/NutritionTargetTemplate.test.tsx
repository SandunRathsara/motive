import { fireEvent, render, screen } from '@testing-library/react-native';
import type { NutritionTargetEditorModel } from '@/features/nutrition';
import { NutritionTargetTemplate } from './NutritionTargetTemplate';

jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 0 }));
const model: NutritionTargetEditorModel = {
  status: 'ready', field: 'kcal', label: 'kcal target', initialValue: '2250', busy: false, saved: false,
  errorText: 'Your floor is 1,780 kcal, based on BMR at your reference weight. Enter at least this amount. Nothing was saved.',
  retry: jest.fn(), saveValue: jest.fn(), reset: jest.fn(),
  goal: { value: 'fatLoss', rate: -0.5, options: [], rates: [], selectGoal: jest.fn(), selectRate: jest.fn(), save: jest.fn() },
};

test('floor refusal is inline, leaves the draft editable, and allows a corrected save', async () => {
  await render(<NutritionTargetTemplate model={model} onDone={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent(/Your floor is 1,780 kcal, based on BMR at your reference weight\./);
  const input = screen.getByLabelText('kcal target');
  expect(input).toHaveDisplayValue('2250');
  await fireEvent.changeText(input, '1800');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(model.saveValue).toHaveBeenCalledWith('1800');
  expect(model.reset).toHaveBeenCalled();
});
