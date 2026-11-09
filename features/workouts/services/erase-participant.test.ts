import { workoutsEraseParticipant } from './erase-participant';
import { requireRecord } from '@/lib/persistence';
import { useActiveWorkout } from '@/store/active-workout';
import { undoWindow } from '../workouts.undo';

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

test('reset clears the active-workout store and isClear reports it', async () => {
  useActiveWorkout.getState().begin('session-1', 'te-1');
  useActiveWorkout.getState().startRest(1_000, 90);
  undoWindow.offer({ kind: 'deleteSet', setId: 'a' }, 'Set logged');
  expect(await workoutsEraseParticipant.isClear()).toBe(false);
  await workoutsEraseParticipant.reset();
  expect(useActiveWorkout.getState()).toMatchObject({ activeSessionId: null, restDeadline: null, expandedExerciseId: null, setTimer: null });
  expect(undoWindow.get()).toBeNull();
  expect(await workoutsEraseParticipant.isClear()).toBe(true);
  expect(workoutsEraseParticipant).toMatchObject({ key: 'workouts', owner: 'workouts' });
});
