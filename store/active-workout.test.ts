import { useActiveWorkout } from './active-workout';

const initial = useActiveWorkout.getState();
beforeEach(() => useActiveWorkout.setState(initial, true));
const store = () => useActiveWorkout.getState();

const timer = { actionableAt: 5, restEndedAt: null, firstTouchAt: null, backgrounded: [], backgroundedAt: null } as const;

test('starts with nothing active', () => {
  expect(store()).toMatchObject({ activeSessionId: null, restDeadline: null, restSeconds: null, expandedExerciseId: null, setTimer: null });
});

test('begin remembers the session and expands its first exercise', () => {
  store().begin('s1', 'te1');
  expect(store()).toMatchObject({ activeSessionId: 's1', expandedExerciseId: 'te1' });
});

test('begin on another session clears the previous rest and expansion', () => {
  store().begin('s1', 'te1');
  store().startRest(1000, 90);
  store().begin('s2', 'te9');
  expect(store()).toMatchObject({ activeSessionId: 's2', expandedExerciseId: 'te9', restDeadline: null, restSeconds: null });
});

test('begin on the same session keeps the rest and the user\'s expansion', () => {
  store().begin('s1', 'te1');
  store().expand('te2');
  store().startRest(1000, 90);
  store().begin('s1', 'te1');
  expect(store()).toMatchObject({ expandedExerciseId: 'te2', restDeadline: 1000, restSeconds: 90 });
});

test('expand collapses when given null', () => {
  store().begin('s1', 'te1');
  store().expand(null);
  expect(store().expandedExerciseId).toBeNull();
});

test('rest is a wall-clock deadline that +30 s extends and Skip clears', () => {
  store().startRest(100_000, 90);
  store().addRest(30_000);
  expect(store()).toMatchObject({ restDeadline: 130_000, restSeconds: 120 });
  store().skipRest();
  expect(store()).toMatchObject({ restDeadline: null, restSeconds: null });
});

test('+30 s with no rest running does nothing', () => {
  store().addRest(30_000);
  expect(store().restDeadline).toBeNull();
});

test('the set timer is replaced wholesale and cleared with end', () => {
  store().begin('s1', null);
  store().setSetTimer(timer);
  expect(store().setTimer).toEqual(timer);
  store().end();
  expect(store()).toMatchObject({ activeSessionId: null, setTimer: null, restDeadline: null, expandedExerciseId: null });
});

test('reset returns to the initial state', () => {
  store().begin('s1', 'te1');
  store().startRest(1, 90);
  store().reset();
  expect(store()).toMatchObject({ activeSessionId: null, restDeadline: null, expandedExerciseId: null });
});
