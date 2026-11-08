import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HealthSignalType } from '../health.types';
import { getHealthSync } from '../services/health';
import { healthKeys } from './query-keys';

export function useDeleteSignalHistory(type: HealthSignalType) {
  const client = useQueryClient();
  const mutation = useMutation({ mutationKey: healthKeys.deleteHistory(type), mutationFn: () => getHealthSync().deleteHistory(type),
    onSettled: () => client.invalidateQueries({ queryKey: healthKeys.all }),
  });
  return { ...mutation, errorText: mutation.isError || mutation.data?.ok === false
    ? "Couldn't delete this signal's history. Try again when the record is ready." : undefined };
}
