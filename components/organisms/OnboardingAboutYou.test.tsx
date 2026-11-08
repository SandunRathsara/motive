import { fireEvent, render, screen } from '@testing-library/react-native';
import type { OnboardingViewModel } from '@/features/onboarding';
import { OnboardingAboutYou } from './OnboardingAboutYou';

const model = {
  sex: '', sexError: 'Choose female or male for the starting estimate.', activityLevel: 1.3,
  fields: [{ key: 'age', label: 'Age (years)', value: '17', error: 'Enter an age from 18 to 90 in whole years.' }],
  activityOptions: [{ value: 1.3, label: 'Mostly sitting' }],
  health: { available: false, busy: false, message: null, sourceText: null },
  setText: jest.fn(), blur: jest.fn(), chooseSex: jest.fn(), chooseActivity: jest.fn(),
} as unknown as OnboardingViewModel;
test('invalid values stay editable with inline announced errors and labelled controls', async () => {
  await render(<OnboardingAboutYou model={model} />);
  expect(screen.getByText('Enter an age from 18 to 90 in whole years.')).toHaveProp('accessibilityRole', 'alert');
  await fireEvent.changeText(screen.getByLabelText('Age (years)'), '30');
  expect(model.setText).toHaveBeenCalledWith('age', '30');
  expect(screen.getByRole('radio', { name: 'Female', checked: false })).toBeOnTheScreen();
  expect(screen.getByRole('radio', { name: 'Mostly sitting', checked: true })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Use Apple Health' })).toBeNull();
});
