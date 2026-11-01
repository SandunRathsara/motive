import { useCallback, useEffect, useState } from 'react';
import type { OpenRecordResult, RecordFailure } from '@/lib/persistence';
import { recoveryService } from '../services/recovery';

export type RecordGateStatus = { status: 'opening' } | { status: 'ready' } |
  { status: 'recovery'; failure: RecordFailure; snapshotExists: boolean };
function gateStatus(result: OpenRecordResult): RecordGateStatus {
  return result.status === 'ready' ? { status: 'ready' } : {
    status: 'recovery', failure: result.failure, snapshotExists: result.snapshotExists,
  };
}

export function useRecordGate() {
  const [state, setState] = useState<RecordGateStatus>({ status: 'opening' });
  const open = useCallback(async () => {
    setState({ status: 'opening' });
    const result = await recoveryService.open();
    setState(gateStatus(result));
  }, []);
  useEffect(() => {
    let cancelled = false;
    void recoveryService.open().then((result) => { if (!cancelled) setState(gateStatus(result)); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (state.status !== 'opening') void recoveryService.reveal(); }, [state.status]);
  const restore = useCallback(async () => {
    const result = await recoveryService.restore();
    if (result.ok) await open();
    return result;
  }, [open]);
  const erase = useCallback(async () => {
    const result = await recoveryService.erase();
    if (result.ok) await open();
    return result;
  }, [open]);
  return { ...state, retry: open, restore, erase, share: recoveryService.share };
}
export type RecordGate = ReturnType<typeof useRecordGate>;
