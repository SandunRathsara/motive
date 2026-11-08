import { useEffect, useRef, useState } from 'react';
import { aiRetentionNotice } from '../retention';
import { eraseAll } from '../services/erase';

export type DeleteAllStep = 'idle' | 'disclosures' | 'final' | 'erasing';
export function useDeleteAllData() {
  const [step, setStep] = useState<DeleteAllStep>('idle');
  const current = useRef(step);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const move = (next: DeleteAllStep) => { current.current = next; setStep(next); };
  return {
    step,
    disclosures: `This removes all Motive data on this device. Apple Health data and already-shared exports are not erased. ${aiRetentionNotice}`,
    begin: () => { if (current.current === 'idle') move('disclosures'); },
    next: () => { if (current.current === 'disclosures') move('final'); },
    cancel: () => { if (current.current !== 'erasing') move('idle'); },
    confirm: async () => {
      if (current.current !== 'final') return;
      move('erasing');
      // The service/store own completion: Settings is unmounted as soon as erasing starts.
      const outcome = await eraseAll();
      if (!outcome.ok && outcome.code === 'busy' && mounted.current) move('final');
      return outcome;
    },
  };
}
export type DeleteAllDataViewModel = ReturnType<typeof useDeleteAllData>;
