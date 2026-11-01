import { fireEvent, render, screen } from '@testing-library/react-native';
import type { RecordRecoveryViewModel } from '@/features/record-recovery';
import { RecoveryTemplate } from './RecoveryTemplate';

function model(overrides: Partial<RecordRecoveryViewModel> = {}): RecordRecoveryViewModel {
  return {
    title: 'Your record couldn’t open', body: 'Try again. Nothing has been deleted.', snapshotExists: true,
    step: 'actions', confirmation: '', busy: false, error: null, canErase: false, erasePhrase: 'ERASE', warning: null,
    setConfirmation: jest.fn(), retry: jest.fn(), chooseRestore: jest.fn(), chooseShare: jest.fn(), chooseErase: jest.fn(), cancel: jest.fn(),
    confirmRestore: jest.fn(), confirmShare: jest.fn(), confirmErase: jest.fn(), ...overrides,
  };
}
test('all applicable actions have accessible names, roles and disabled states', async () => {
  const props = model();
  await render(<RecoveryTemplate model={props} />);
  for (const name of ['Retry', 'Restore snapshot', 'Share raw database', 'Erase and start over']) {
    expect(screen.getByRole('button', { name })).toBeEnabled();
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(props.retry).toHaveBeenCalledTimes(1);
  await screen.rerender(<RecoveryTemplate model={model({ snapshotExists: false, busy: true })} />);
  expect(screen.queryByRole('button', { name: 'Restore snapshot' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
});
test('typed-confirm input is labelled, and erase respects the view-model gate', async () => {
  const props = model({ step: 'erase', warning: 'This removes Motive data.' });
  await render(<RecoveryTemplate model={props} />);
  const erase = () => screen.getByRole('button', { name: 'Confirm erase and start over' });
  expect(erase()).toBeDisabled();
  await fireEvent.press(erase());
  expect(props.confirmErase).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Erase confirmation'), 'ERASE');
  expect(props.setConfirmation).toHaveBeenCalledWith('ERASE');
  await screen.rerender(<RecoveryTemplate model={{ ...props, canErase: true, confirmation: 'ERASE' }} />);
  expect(erase()).toBeEnabled();
  await fireEvent.press(erase());
  expect(props.confirmErase).toHaveBeenCalledTimes(1);
});
test.each([
  { step: 'share' as const, warning: 'This file is not encrypted and contains your health data.', label: 'Continue to share sheet' },
  { step: 'restore' as const, warning: 'Restoring discards anything written after the snapshot.', label: 'Confirm restore snapshot' },
])('$step shows its warning before the confirm control', async ({ step, warning, label }) => {
  await render(<RecoveryTemplate model={model({ step, warning })} />);
  expect(screen.getByText(warning)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: label })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
});
