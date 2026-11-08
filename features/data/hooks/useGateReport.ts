import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GateReportBuild } from '../report.utils';
import { loadGateReport, type GateReport } from '../services/report';
import { dataKeys } from './query-keys';

export interface GateReportViewModel {
  status: 'loading' | 'error' | 'ready';
  report: GateReport | null;
  builds: GateReportBuild[];
  selectedBuild: string | null;
  selectBuild: (build: string | null) => void;
  retry: () => void;
}

export function useGateReport(): GateReportViewModel {
  const [selectedBuild, selectBuild] = useState<string | null>(null);
  const query = useQuery({
    queryKey: dataKeys.report(selectedBuild ?? undefined),
    queryFn: () => loadGateReport({ build: selectedBuild ?? undefined }),
  });
  return {
    status: query.isPending ? 'loading' : query.isError ? 'error' : 'ready',
    report: query.data ?? null,
    builds: query.data?.builds ?? [],
    selectedBuild, selectBuild,
    retry: () => { void query.refetch(); },
  };
}
