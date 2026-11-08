import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { DataExportViewModel, DeleteAllDataViewModel, FaultInjectionViewModel } from '@/features/data';
import { SettingsTemplate } from './SettingsTemplate';

const exportModel: DataExportViewModel = {
  step: 'idle', begin: jest.fn(), confirm: jest.fn(), cancel: jest.fn(), retry: jest.fn(), dismiss: jest.fn(),
};
const deleteModel: DeleteAllDataViewModel = {
  step: 'idle', disclosures: 'Delete disclosures', begin: jest.fn(), next: jest.fn(), cancel: jest.fn(), confirm: jest.fn(),
};
const verification: FaultInjectionViewModel = { available: true, armed: 'afterStaging', arm: jest.fn() };

test('empty section slots render nothing; supplied slots stay in the specified order', async () => {
  await render(<SettingsTemplate />);
  expect(screen.queryAllByRole('header')).toHaveLength(0);
  await screen.rerender(<SettingsTemplate plan={<Text>Plan controls</Text>} training={<Text>Training controls</Text>}
    aiAndConsents={<Text>Consent controls</Text>} health={<Text>Health controls</Text>}
    data={{ exportModel, deleteModel, busy: false, exportPaused: false, onOpenReport: jest.fn() }}
    about={{ onOpen: jest.fn() }} verification={verification} />);
  expect(screen.getAllByRole('header').map((node) => node.props.children)).toEqual([
    'Plan', 'Training', 'AI and consents', 'Health', 'Data', 'About', 'Verification',
  ]);
  expect(screen.getByText('Plan controls')).toBeOnTheScreen();
  expect(screen.getByText('Consent controls')).toBeOnTheScreen();
});

test('data and navigation rows call their supplied actions, and busy operations disable export and deletion', async () => {
  const onOpenReport = jest.fn();
  const onOpen = jest.fn();
  const data = { exportModel, deleteModel, busy: false, exportPaused: false, onOpenReport };
  await render(<SettingsTemplate data={data} about={{ onOpen }} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Export data' }));
  expect(exportModel.begin).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete all data' }));
  expect(deleteModel.begin).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'Phase 1 report' }));
  expect(onOpenReport).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: 'About' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
  await screen.rerender(<SettingsTemplate data={{ ...data, busy: true }} />);
  expect(screen.getByRole('button', { name: 'Export data' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete all data' })).toBeDisabled();
  expect(screen.queryByRole('header', { name: 'Verification' })).toBeNull();
});

test('verification exists only when provided and marks the armed pause selected', async () => {
  await render(<SettingsTemplate verification={verification} />);
  expect(screen.getByRole('button', { name: 'Pause after export staging is written', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Pause after the database is deleted' }));
  expect(verification.arm).toHaveBeenCalledWith('afterDatabaseDeleted');
  await fireEvent.press(screen.getByRole('button', { name: 'No pause' }));
  expect(verification.arm).toHaveBeenLastCalledWith(null);
  await screen.rerender(<SettingsTemplate />);
  expect(screen.queryByRole('header', { name: 'Verification' })).toBeNull();
});
