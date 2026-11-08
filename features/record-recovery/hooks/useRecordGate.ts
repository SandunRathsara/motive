import { useCallback, useEffect, useState } from 'react';
import type { RecordFailure } from '@/lib/persistence';
import { useRecordLifecycle } from '@/store/record-lifecycle';
import { recoveryService, type RecoveryOpenResult } from '../services/recovery';

export type RecordGateStatus = { status: 'opening' } | { status: 'ready' } |
  { status: 'recovery'; failure: RecordFailure; snapshotExists: boolean };
function gateStatus(result: RecoveryOpenResult): RecordGateStatus {
  // The root must render its lifecycle blocker before the normal opening/null branch.
  if (result.status === 'erase-blocked') return { status: 'opening' };
  return result.status === 'ready' ? { status: 'ready' } : {
    status: 'recovery', failure: result.failure, snapshotExists: result.snapshotExists,
  };
}

export function useRecordGate() {
  const generation = useRecordLifecycle((state) => state.eraseGeneration);
  const phase = useRecordLifecycle((state) => state.phase);
  const [state, setState] = useState<{ generation: number; value: RecordGateStatus }>({ generation, value: { status: 'opening' } });
  const open = useCallback(async () => {
    const generation = useRecordLifecycle.getState().eraseGeneration;
    setState({ generation, value: { status: 'opening' } });
    const result = await recoveryService.open();
    setState({ generation, value: gateStatus(result) });
  }, []);
  useEffect(() => {
    let cancelled = false;
    void recoveryService.open().then((result) => { if (!cancelled) setState({ generation, value: gateStatus(result) }); });
    return () => { cancelled = true; };
  }, [generation]);
  // Never render the old record between erase completion and the fresh opener's effect.
  const value: RecordGateStatus = state.generation === generation ? state.value : { status: 'opening' };
  useEffect(() => { if (value.status !== 'opening' || phase === 'erase-blocked') void recoveryService.reveal(); }, [value.status, phase]);
  const restore = useCallback(async () => {
    const result = await recoveryService.restore();
    if (result.ok) await open();
    return result;
  }, [open]);
  const erase = useCallback(() => recoveryService.erase(), []);
  return { ...value, retry: open, restore, erase, share: recoveryService.share };
}
export type RecordGate = ReturnType<typeof useRecordGate>;
