import { useQuery } from '@tanstack/react-query';
import { createProfileRepository, type ProfileError } from '../services/profile-repository';
import { profileKeys } from './query-keys';

export function useProfile() {
  return useQuery<Awaited<ReturnType<ReturnType<typeof createProfileRepository>['read']>>, ProfileError>({
    queryKey: profileKeys.current, queryFn: () => createProfileRepository().read(),
  });
}
