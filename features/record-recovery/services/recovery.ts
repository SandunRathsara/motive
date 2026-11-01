import * as Sharing from 'expo-sharing';
import * as SplashScreen from 'expo-splash-screen';
import { eraseRecord, openRecord, rawDatabaseUri, restoreSnapshot, type OpenRecordResult } from '@/lib/persistence';
import { logEvent } from '@/lib/logger';

// Hold before any React view hierarchy mounts; the root gate renders null while opening.
void SplashScreen.preventAutoHideAsync().catch(() => logEvent('record_failure', { errorCode: 'splashFailed' }));
export type RecoveryOutcome = { ok: true } | { ok: false; code: 'eraseFailed' | 'restoreFailed' | 'shareFailed' | 'sharingUnavailable' };
export const recoveryService = {
  async open(): Promise<OpenRecordResult> {
    try { return await openRecord(); }
    catch { return { status: 'failed', failure: { code: 'openFailed' }, snapshotExists: false }; }
  },
  async restore(): Promise<RecoveryOutcome> {
    try { return (await restoreSnapshot()).ok ? { ok: true } : { ok: false, code: 'restoreFailed' }; }
    catch { return { ok: false, code: 'restoreFailed' }; }
  },
  async erase(): Promise<RecoveryOutcome> {
    try { return (await eraseRecord()).ok ? { ok: true } : { ok: false, code: 'eraseFailed' }; }
    catch { return { ok: false, code: 'eraseFailed' }; }
  },
  async share(): Promise<RecoveryOutcome> {
    try {
      if (!await Sharing.isAvailableAsync()) return { ok: false, code: 'sharingUnavailable' };
      await Sharing.shareAsync(await rawDatabaseUri(), { mimeType: 'application/octet-stream', dialogTitle: 'Share raw database' });
      return { ok: true };
    } catch { return { ok: false, code: 'shareFailed' }; }
  },
  async reveal(): Promise<void> {
    try { await SplashScreen.hideAsync(); }
    catch { logEvent('record_failure', { errorCode: 'splashFailed' }); }
  },
};
