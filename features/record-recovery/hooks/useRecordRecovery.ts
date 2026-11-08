import { useRef, useState } from 'react';
import type { RecordFailure } from '@/lib/persistence';
import { deleteAllDisclosure } from '@/features/data';
import type { RecoveryOutcome } from '../services/recovery';
import type { RecordGate } from './useRecordGate';

export const erasePhrase = 'ERASE';
export type RecoveryStep = 'actions' | 'restore' | 'share' | 'erase';
export function recoveryCopy(failure: RecordFailure): { title: string; body: string } {
  switch (failure.code) {
    case 'openFailed': return { title: 'Your record couldn’t open', body: 'Try again. Your record has not been reset or deleted.' };
    case 'integrityFailed': return { title: 'Your record needs attention', body: 'The record check did not pass. Nothing has been reset or deleted. You can keep a copy before choosing what to do.' };
    case 'migrationFailed': return { title: 'The record update couldn’t finish', body: `The update from version ${failure.from} to ${failure.to} did not finish. Your record has not been reset or deleted.` };
    case 'newerSchema': return { title: 'This record needs a newer build', body: `This record was made by a newer build (record version ${failure.found}; this build supports ${failure.supported}). Install that build or a newer one. Nothing has been changed or deleted.` };
  }
}
const errors = {
  eraseFailed: 'Couldn’t verify that all data was erased. Your record is not ready. Try again.',
  restoreFailed: 'Couldn’t restore the snapshot. Your record is not ready. Try again.',
  shareFailed: 'Couldn’t share the database. Nothing has been erased. Try again.',
  sharingUnavailable: 'Sharing isn’t available on this device. Nothing has been erased.',
};
export function useRecordRecovery(gate: RecordGate) {
  const [step, setStep] = useState<RecoveryStep>('actions');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const run = async (action: () => Promise<RecoveryOutcome | void>) => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const result = await action();
      if (result && !result.ok) setError(errors[result.code]);
      else { setStep('actions'); setConfirmation(''); }
    } finally { running.current = false; setBusy(false); }
  };
  const choose = (next: RecoveryStep) => {
    if (running.current) return;
    setStep(next); setConfirmation(''); setError(null);
  };
  const canErase = confirmation.trim() === erasePhrase && !busy;
  return {
    ...(gate.status === 'recovery' ? recoveryCopy(gate.failure) : { title: '', body: '' }),
    snapshotExists: gate.status === 'recovery' && gate.snapshotExists,
    step, confirmation, busy, error, canErase, erasePhrase,
    warning: step === 'restore' ? 'Restoring the snapshot discards anything written after the snapshot. This cannot be undone.' :
      step === 'share' ? 'This file is not encrypted and contains your health data. Only share it with someone you trust.' :
      step === 'erase' ? deleteAllDisclosure : null,
    setConfirmation,
    retry: () => run(gate.retry),
    chooseRestore: () => { if (gate.status === 'recovery' && gate.snapshotExists) choose('restore'); },
    chooseShare: () => choose('share'), chooseErase: () => choose('erase'), cancel: () => choose('actions'),
    confirmRestore: () => { if (step === 'restore' && gate.status === 'recovery' && gate.snapshotExists) return run(gate.restore); },
    confirmShare: () => { if (step === 'share') return run(gate.share); },
    confirmErase: () => { if (step === 'erase' && canErase) return run(gate.erase); },
  };
}
export type RecordRecoveryViewModel = ReturnType<typeof useRecordRecovery>;
