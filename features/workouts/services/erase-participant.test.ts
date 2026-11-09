import { workoutsEraseParticipant } from './erase-participant';
import { requireRecord } from '@/lib/persistence';

jest.mock('@/lib/persistence', () => ({ ...jest.requireActual('@/lib/persistence'), requireRecord: jest.fn() }));

test('quiesce drains pending record writes and tolerates a record that is not open', async () => {
  const order: string[] = [];
  jest.mocked(requireRecord).mockReturnValue({ transaction: async (work: (tx: never) => Promise<void>) => { order.push('drain'); await work(undefined as never); } } as never);
  await workoutsEraseParticipant.quiesce();
  expect(order).toEqual(['drain']);
  const { RecordNotReadyError } = jest.requireActual('@/lib/persistence');
  jest.mocked(requireRecord).mockImplementation(() => { throw new RecordNotReadyError(); });
  await expect(workoutsEraseParticipant.quiesce()).resolves.toBeUndefined();
  jest.mocked(requireRecord).mockImplementation(() => { throw new Error('boom'); });
  await expect(workoutsEraseParticipant.quiesce()).rejects.toThrow('boom');
});

test('holds no in-memory state of its own, so it is always clear', async () => {
  await workoutsEraseParticipant.reset();
  expect(await workoutsEraseParticipant.isClear()).toBe(true);
  expect(workoutsEraseParticipant).toMatchObject({ key: 'workouts', owner: 'workouts' });
});
