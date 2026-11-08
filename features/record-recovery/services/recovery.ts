import * as SplashScreen from 'expo-splash-screen';
import { openRecord, rawDatabaseUri, restoreSnapshot, type OpenRecordResult } from '@/lib/persistence';
import { logEvent } from '@/lib/logger';
import { eraseAll, nativeShare, resumePendingErase, sweepExportStaging } from '@/features/data';

// Hold before any React view hierarchy mounts; the root gate renders null while opening.
void SplashScreen.preventAutoHideAsync().catch(() => logEvent('record_failure', { errorCode: 'splashFailed' }));
export type RecoveryOutcome = { ok: true } | { ok: false; code: 'eraseFailed' | 'restoreFailed' | 'shareFailed' | 'sharingUnavailable' };
export type RecoveryOpenResult = OpenRecordResult | { status: 'erase-blocked' };
export const recoveryService = {
  async open(): Promise<RecoveryOpenResult> {
    try {
      if (!(await resumePendingErase()).ok) return { status: 'erase-blocked' };
      await sweepExportStaging();
      return await openRecord();
    }
    catch { return { status: 'failed', failure: { code: 'openFailed' }, snapshotExists: false }; }
  },
  async restore(): Promise<RecoveryOutcome> {
    try { return (await restoreSnapshot()).ok ? { ok: true } : { ok: false, code: 'restoreFailed' }; }
    catch { return { ok: false, code: 'restoreFailed' }; }
  },
  async erase(): Promise<RecoveryOutcome> {
    try { return (await eraseAll()).ok ? { ok: true } : { ok: false, code: 'eraseFailed' }; }
    catch { return { ok: false, code: 'eraseFailed' }; }
  },
  async share(): Promise<RecoveryOutcome> {
    try {
      return await nativeShare.share({ uri: await rawDatabaseUri(), mimeType: 'application/octet-stream', dialogTitle: 'Share raw database' });
    } catch { return { ok: false, code: 'shareFailed' }; }
  },
  async reveal(): Promise<void> {
    try { await SplashScreen.hideAsync(); }
    catch { logEvent('record_failure', { errorCode: 'splashFailed' }); }
  },
};
