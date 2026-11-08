import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getHealthSync } from '../services/health';
import { healthKeys } from './query-keys';
import { healthSyncFailed } from './health-sync-result';

export function useHealthRefresh() {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: healthKeys.refresh, mutationFn: () => getHealthSync().sync('refresh'),
    onSettled: () => client.invalidateQueries({ queryKey: healthKeys.all }),
  });
  return { ...mutation, errorText: mutation.isError || healthSyncFailed(mutation.data)
    ? "Couldn't refresh every signal. Your cached history is still available. Pull to refresh to try again." : undefined };
}
