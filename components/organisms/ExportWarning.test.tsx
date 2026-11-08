import { fireEvent, render, screen } from '@testing-library/react-native';
import type { DataExportViewModel } from '@/features/data';
import { ExportWarning } from './ExportWarning';

function model(state: Partial<DataExportViewModel> = {}): DataExportViewModel {
  return { step: 'warning', begin: jest.fn(), confirm: jest.fn(), cancel: jest.fn(), retry: jest.fn(), dismiss: jest.fn(), ...state } as DataExportViewModel;
}

test('warns about the plaintext health record before offering share or cancel', async () => {
  const props = model();
  await render(<ExportWarning model={props} />);
  expect(screen.getByText('This file is not encrypted and contains your health record. Anyone who can open it can read it.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Continue to share sheet' }));
  expect(props.confirm).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(props.cancel).toHaveBeenCalledTimes(1);
});

test('exporting cannot be cancelled and a verification pause explains how to force-quit', async () => {
  await render(<ExportWarning model={model({ step: 'exporting' })} />);
  expect(screen.getByText('Preparing your export…')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
  await screen.rerender(<ExportWarning model={model({ step: 'exporting' })} paused />);
  expect(screen.getByText('Paused for verification after export staging is written. Force-quit Motive now.')).toBeOnTheScreen();
});

test('a failed export shows the plain reason and offers retry and dismissal', async () => {
  const props = model({ step: 'failed', code: 'storageFull', reason: 'Not enough free space. Nothing was shared.' });
  await render(<ExportWarning model={props} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Not enough free space. Nothing was shared.');
  await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
  expect(props.retry).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(props.dismiss).toHaveBeenCalledTimes(1);
});

test('cleanup failure offers dismissal but not a Retry that could share another copy', async () => {
  const reason = 'The temporary copy could not be removed. Motive will try again next launch.';
  const props = model({ step: 'failed', code: 'cleanupFailed', reason });
  await render(<ExportWarning model={props} />);
  expect(screen.getByRole('alert')).toHaveTextContent(reason);
  expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
  expect(props.dismiss).toHaveBeenCalledTimes(1);
});

test('completion counts skipped rows only when present and never claims the file was saved', async () => {
  const props = model({ step: 'done', skippedCount: 2 });
  await render(<ExportWarning model={props} />);
  expect(screen.getByText('2 rows couldn’t be read and were skipped.')).toBeOnTheScreen();
  expect(screen.getByText('Export finished.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
  expect(props.dismiss).toHaveBeenCalledTimes(1);
  await screen.rerender(<ExportWarning model={model({ step: 'done', skippedCount: 0 })} />);
  expect(screen.queryByText(/skipped/)).toBeNull();
  await screen.rerender(<ExportWarning model={model({ step: 'idle' })} />);
  expect(screen.queryByText('Export finished.')).toBeNull();
});
