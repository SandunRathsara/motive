import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { TodayPlanViewModel } from '@/features/plan';
import { TodayTemplate } from './TodayTemplate';

const model = {
  status: 'ready', dateLabel: 'Sunday, November 8', chipLabel: 'Plan v1',
  targets: { kcalTarget: 2250, kcalOrigin: 'startingEstimate', proteinFloorG: 144 }, retry: jest.fn(),
} satisfies TodayPlanViewModel;
const actions = { onOpenSettings: jest.fn(), onOpenTargets: jest.fn(), onEditKcal: jest.fn(), onEditProtein: jest.fn() };

test('Today shows recorded targets, starting-estimate label, v1 chip and accessible Settings actions without fake intake', async () => {
  await render(<TodayTemplate model={model} {...actions} />);
  expect(screen.getByText('Sunday, November 8')).toBeOnTheScreen();
  expect(screen.getByText('2,250 kcal')).toBeOnTheScreen();
  expect(screen.getByText('144 g')).toBeOnTheScreen();
  expect(screen.getByText('starting estimate')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Plan v1' }));
  expect(actions.onOpenTargets).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Settings' }));
  expect(actions.onOpenSettings).toHaveBeenCalled();
  expect(screen.queryByText(/consumed|^0 kcal$|readiness|score|not built/i)).toBeNull();
});

test.each(['yourEdit', 'planChange'] as const)('Today drops the starting label for %s and shows a later change-day chip', async (kcalOrigin) => {
  await render(<TodayTemplate model={{ ...model, chipLabel: 'Plan v3 · changed today', targets: { ...model.targets, kcalOrigin } }} {...actions} />);
  expect(screen.queryByText('starting estimate')).toBeNull();
  expect(screen.getByRole('button', { name: 'Plan v3 · changed today' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'kcal target' }));
  expect(actions.onEditKcal).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Protein floor' }));
  expect(actions.onEditProtein).toHaveBeenCalled();
});

test('Today omits the chip on an unchanged day and missing record data is never rendered as zero', async () => {
  const view = await render(<TodayTemplate model={{ ...model, chipLabel: null }} {...actions} />);
  expect(screen.queryByRole('button', { name: /Plan v/ })).toBeNull();
  await view.rerender(<TodayTemplate model={{ ...model, status: 'loading', targets: null, chipLabel: null }} {...actions} />);
  expect(screen.getByText('Loading your targets…')).toBeOnTheScreen();
  expect(screen.queryByText(/kcal|grams|protein floor/)).toBeNull();
  await view.rerender(<TodayTemplate model={{ ...model, status: 'error', targets: null, chipLabel: null }} {...actions} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(model.retry).toHaveBeenCalled();
});

test('Today renders the training card in the scroll and pins the quick-add outside it', async () => {
  await render(<TodayTemplate model={model} {...actions} training={<Text>Training card</Text>} quickAdd={<Text>Quick add</Text>} />);
  expect(screen.getByText('Training card')).toBeOnTheScreen();
  expect(screen.getByText('Quick add')).toBeOnTheScreen();
  // The quick-add must stay visible however long the content is: it is a sibling of the ScrollView, not inside it.
  const scroll = screen.getByText('Training card').parent;
  let node = screen.getByText('Quick add').parent;
  while (node) { expect(node).not.toBe(scroll); node = node.parent; }
});
