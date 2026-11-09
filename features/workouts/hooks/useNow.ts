import { useCallback, useEffect, useState } from 'react';
import { useAppStateChange } from './shared';

/** Re-reads the clock when the app returns to the foreground and after each 04:00 boundary (weeks and days roll over). */
export function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const next = new Date(now);
    next.setHours(4, 0, 0, 0);
    if (next.getTime() <= now) next.setDate(next.getDate() + 1);
    const timer = setTimeout(() => setNow(Date.now()), next.getTime() - now);
    return () => clearTimeout(timer);
  }, [now]);
  useAppStateChange(useCallback((state) => { if (state === 'active') setNow(Date.now()); }, []));
  return now;
}
