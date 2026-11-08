import { QueryClient } from '@tanstack/react-query';

/**
 * The Personal Health Record is local, so queries and mutations must run in airplane mode (§9):
 * `networkMode: 'always'` stops Query from pausing them while offline.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always', retry: false },
    mutations: { networkMode: 'always', retry: false },
  },
});
