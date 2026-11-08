import { recordWritesAllowed, useRecordLifecycle } from './record-lifecycle';

const initial = useRecordLifecycle.getState();
beforeEach(() => useRecordLifecycle.setState(initial, true));
const store = () => useRecordLifecycle.getState();

test('only one export at a time, and only from ready', () => {
  expect(store().beginExport()).toBe(true);
  expect(store().phase).toBe('exporting');
  expect(store().beginExport()).toBe(false);
  expect(store().beginErase()).toBe(false);
  store().endExport();
  expect(store().phase).toBe('ready');
});

test('erase blocks writes until verified, then returns to ready with a new generation', () => {
  expect(store().beginErase()).toBe(true);
  expect(recordWritesAllowed()).toBe(false);
  expect(store().beginExport()).toBe(false);
  expect(store().beginErase()).toBe(false);
  store().blockErase();
  expect(store().phase).toBe('erase-blocked');
  expect(recordWritesAllowed()).toBe(false);
  expect(store().beginErase()).toBe(true);
  store().completeErase();
  expect(store()).toMatchObject({ phase: 'ready', eraseGeneration: 1 });
  expect(recordWritesAllowed()).toBe(true);
});

test('ending an export never overrides an erase phase', () => {
  store().beginErase();
  store().endExport();
  expect(store().phase).toBe('erasing');
});

test('launch resume completes without requesting another record open', () => {
  store().beginErase();
  store().completeErase(false);
  expect(store()).toMatchObject({ phase: 'ready', eraseGeneration: 0 });
});
