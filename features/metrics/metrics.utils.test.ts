import { recoverUncleanExit, trackAppState, type LaunchSentinel } from './metrics.utils';

test('previous launch yields exactly one event stamped with that launch’s build', async () => {
  let value: string | null = '1.0.0+old';
  const sentinel: LaunchSentinel = {
    read: async () => value,
    write: async (build) => { value = build; },
    clear: async () => { value = null; },
  };
  const record = jest.fn(async () => {});
  await recoverUncleanExit(sentinel, record);
  await recoverUncleanExit(sentinel, record);
  expect(record).toHaveBeenCalledTimes(1);
  expect(record).toHaveBeenCalledWith({ event_type: 'unclean_exit' }, '1.0.0+old');
  await trackAppState('active', sentinel, '1.0.0+new');
  expect(value).toBe('1.0.0+new');
  await trackAppState('inactive', sentinel, '1.0.0+new');
  expect(value).toBe('1.0.0+new');
  await trackAppState('background', sentinel, '1.0.0+new');
  expect(value).toBeNull();
});

test('failed metric commit keeps the old sentinel for retry', async () => {
  const sentinel = { read: async () => 'old', write: async () => {}, clear: jest.fn(async () => {}) };
  await expect(recoverUncleanExit(sentinel, async () => { throw new Error('not saved'); })).rejects.toThrow('not saved');
  expect(sentinel.clear).not.toHaveBeenCalled();
});
