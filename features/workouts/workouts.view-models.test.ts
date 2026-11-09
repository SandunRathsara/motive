import { toLoadable, workoutErrorText } from './workouts.view-models';

describe('error copy', () => {
  test('maps typed codes to calm text and stays silent without an error', () => {
    expect(workoutErrorText(null)).toBeUndefined();
    expect(workoutErrorText({ code: 'writeFailed' })).toBe('Not saved. Nothing was changed. Try again.');
    expect(workoutErrorText({ code: 'activeSessionExists' })).toBe('A session is already in progress. Resume it or finish it first.');
    expect(workoutErrorText(new Error('anything else'))).toBe('Not saved. Nothing was changed. Try again.');
  });
});

describe('toLoadable', () => {
  const query = (over: Partial<Parameters<typeof toLoadable>[0]>) => ({ isPending: false, isError: false, data: 1, refetch: jest.fn(), ...over });
  test('is loading while pending, an error with retry on failure, and ready with the built content otherwise', () => {
    expect(toLoadable(query({ isPending: true, data: undefined }), () => ({}))).toEqual({ status: 'loading' });
    const refetch = jest.fn();
    const failed = toLoadable(query({ isError: true, refetch }), () => ({}));
    expect(failed.status).toBe('error');
    (failed as { retry: () => void }).retry();
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(toLoadable(query({ data: 2 }), (data) => ({ doubled: (data as number) * 2 }))).toEqual({ status: 'ready', doubled: 4 });
  });
});
