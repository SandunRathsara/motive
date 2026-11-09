import { onlineManager } from '@tanstack/react-query';
import { queryClient } from './client';

// Airplane mode flips Query's online state. The local record must keep working: a paused query or
// mutation would leave Train, Today and set logging waiting on a network that is never needed (§9).
// Each test asserts that the work ran after one flush, so a regression fails fast instead of hanging.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  onlineManager.setOnline(true);
  queryClient.clear();
});

test('a query reads while offline instead of pausing', async () => {
  onlineManager.setOnline(false);
  const read = jest.fn(async () => 'local');
  const result = queryClient.fetchQuery({ queryKey: ['offline-read'], queryFn: read, gcTime: Infinity });
  await flush();
  expect(read).toHaveBeenCalledTimes(1);
  await expect(result).resolves.toBe('local');
});

test('a mutation commits while offline instead of pausing', async () => {
  onlineManager.setOnline(false);
  const commit = jest.fn(async () => 'saved');
  const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: commit, gcTime: Infinity });
  const result = mutation.execute(undefined);
  await flush();
  expect(commit).toHaveBeenCalledTimes(1);
  expect(mutation.state.isPaused).toBe(false);
  await expect(result).resolves.toBe('saved');
});
