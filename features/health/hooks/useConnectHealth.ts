import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getHealthSync } from '../services/health';
import { healthKeys } from './query-keys';
import { healthSyncFailed } from './health-sync-result';

export function useConnectHealth() {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: healthKeys.connect, mutationFn: () => getHealthSync().connect(),
    onSettled: () => client.invalidateQueries({ queryKey: healthKeys.all }),
  });
  return { ...mutation, errorText: mutation.isError || healthSyncFailed(mutation.data)
    ? "Couldn't connect every signal. Check Health access and source sync, then try again." : undefined };
}
