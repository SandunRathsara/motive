import { useFaultInjectionStore } from './fault-injection';

beforeEach(() => useFaultInjectionStore.setState(useFaultInjectionStore.getInitialState(), true));

test('arming replaces or clears the selected fault without pausing an operation', () => {
  const faults = useFaultInjectionStore.getState();
  expect(faults).toMatchObject({ armed: null, paused: null });
  faults.arm('afterStaging');
  expect(useFaultInjectionStore.getState()).toMatchObject({ armed: 'afterStaging', paused: null });
  faults.arm('afterDatabaseDeleted');
  expect(useFaultInjectionStore.getState()).toMatchObject({ armed: 'afterDatabaseDeleted', paused: null });
  faults.arm(null);
  expect(useFaultInjectionStore.getState()).toMatchObject({ armed: null, paused: null });
});

test('pause reports the halted step and disarming cannot resume that operation', () => {
  const faults = useFaultInjectionStore.getState();
  faults.arm('afterDatabaseDeleted');
  faults.pause('afterDatabaseDeleted');
  expect(useFaultInjectionStore.getState()).toMatchObject({ armed: 'afterDatabaseDeleted', paused: 'afterDatabaseDeleted' });
  faults.arm(null);
  expect(useFaultInjectionStore.getState()).toMatchObject({ armed: null, paused: 'afterDatabaseDeleted' });
});
