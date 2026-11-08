import { useCallback, useEffect, useRef, useState } from 'react';
import { healthPrefillAvailable, prefillHealthWeight, type HealthWeightPrefill } from '../services/health-prefill';

export function useHealthPrefill(active: boolean, onKnown: (value: HealthWeightPrefill) => void) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const generation = useRef(0);
  const running = useRef(false);
  const invalidate = useCallback(() => { generation.current++; running.current = false; }, []);
  const cancel = useCallback(() => { invalidate(); setBusy(false); setMessage(null); }, [invalidate]);
  useEffect(() => {
    let mounted = true;
    if (active) void healthPrefillAvailable().then((value) => { if (mounted) setAvailable(value); });
    return () => { mounted = false; invalidate(); };
  }, [active, invalidate]);
  const request = async () => {
    if (!active || running.current) return;
    running.current = true;
    const current = ++generation.current;
    setBusy(true); setMessage(null);
    const result = await prefillHealthWeight();
    if (generation.current !== current) return;
    running.current = false; setBusy(false);
    if (result) onKnown(result);
    else setMessage('No weight to use right now. You can type your weight instead.');
  };
  return { available, busy, message, request, cancel };
}
