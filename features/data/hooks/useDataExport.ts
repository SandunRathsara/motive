import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { exportService, type ExportErrorCode } from '../services/export';

export type DataExportState =
  | { step: 'idle' | 'warning' | 'exporting' }
  | { step: 'done'; skippedCount: number }
  | { step: 'failed'; code: ExportErrorCode; reason: string };

export type DataExportViewModel = DataExportState & {
  begin(): void;
  confirm(): Promise<void>;
  cancel(): void;
  retry(): Promise<void>;
  dismiss(): void;
};

const reasons: Record<ExportErrorCode, string> = {
  storageFull: 'There isn’t enough free space on this iPhone to create the export. Nothing was shared.',
  writeFailed: 'Couldn’t create the export file. Nothing was shared. Try again.',
  validationFailed: 'Couldn’t prepare a valid export. Nothing was shared. Try again.',
  cancelled: 'The export was cancelled. Nothing was shared.',
  sharingUnavailable: 'Sharing isn’t available on this iPhone. Nothing was shared. Try again.',
  shareFailed: 'Couldn’t open or finish sharing the export. Nothing was shared. Try again.',
  cleanupFailed: 'Motive couldn’t remove its temporary export copy. The file may already have been shared. It will try again the next time Motive opens.',
  busy: 'Another data operation is still running. Nothing was shared. Try again when it finishes.',
};

/** Warning copy belongs to the organism; this hook only controls its confirmation gate. */
export function useDataExport(): DataExportViewModel {
  const [warning, setWarning] = useState(false);
  const warned = useRef(false);
  const running = useRef(false);
  // Inherit the shared offline/no-retry defaults; an export is never automatically repeated.
  const mutation = useMutation({ mutationKey: ['data', 'export'], mutationFn: () => exportService.export() });
  const run = async () => {
    if (running.current) return;
    running.current = true;
    warned.current = false;
    setWarning(false);
    try { await mutation.mutateAsync(); }
    catch { /* Unexpected service failures use the same safe, retryable UI below. */ }
    finally { running.current = false; }
  };
  const dismiss = () => {
    // The sheet must close before staging can be removed; don't pretend to cancel it here.
    if (running.current) return;
    warned.current = false;
    setWarning(false);
    mutation.reset();
  };
  let state: DataExportState;
  if (mutation.isPending) state = { step: 'exporting' };
  else if (mutation.isError) state = { step: 'failed', code: 'writeFailed', reason: reasons.writeFailed };
  else if (mutation.data?.ok) state = { step: 'done', skippedCount: mutation.data.skippedCount };
  else if (mutation.data) state = { step: 'failed', code: mutation.data.code, reason: reasons[mutation.data.code] };
  else state = { step: warning ? 'warning' : 'idle' };
  return {
    ...state,
    begin: () => {
      if (running.current) return;
      mutation.reset();
      warned.current = true;
      setWarning(true);
    },
    confirm: async () => { if (warned.current) await run(); },
    cancel: dismiss,
    retry: async () => { if (state.step === 'failed' && state.code !== 'cleanupFailed') await run(); },
    dismiss,
  };
}
