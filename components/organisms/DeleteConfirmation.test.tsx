import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DeleteAllDataViewModel } from '@/features/data';
import { DeleteConfirmation } from './DeleteConfirmation';

const disclosures = 'This removes all Motive data on this device. Apple Health data and already-shared exports are not erased. Data already sent to the AI provider for coaching or food recognition is kept by them for up to 30 days for abuse monitoring, or longer if flagged, and Motive can’t recall it. Motive’s server keeps none of your health or chat content.';
function model(step: DeleteAllDataViewModel['step']): DeleteAllDataViewModel {
  return { step, disclosures, begin: jest.fn(), next: jest.fn(), cancel: jest.fn(), confirm: jest.fn() };
}

test('disclosures come before the final destructive action, with no typing', async () => {
  const first = model('disclosures');
  await render(<DeleteConfirmation model={first} />);
  expect(screen.getByText(disclosures)).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Delete everything' })).toBeNull();
  expect(screen.queryByLabelText('Erase confirmation')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
  expect(first.next).toHaveBeenCalledTimes(1);
  expect(first.confirm).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(first.cancel).toHaveBeenCalledTimes(1);

  const final = model('final');
  await screen.rerender(<DeleteConfirmation model={final} />);
  expect(screen.getByText('This cannot be undone. Motive will return to a fresh start.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Delete everything' }));
  expect(final.confirm).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(final.cancel).toHaveBeenCalledTimes(1);
});

test.each(['idle', 'erasing'] as const)('%s leaves confirmation controls hidden', async (step) => {
  await render(<DeleteConfirmation model={model(step)} />);
  expect(screen.queryByRole('button')).toBeNull();
});
