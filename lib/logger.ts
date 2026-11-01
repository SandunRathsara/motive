export type LogEvent = 'record_failure' | 'rows_skipped';
export type ErrorCode = 'openFailed' | 'integrityFailed' | 'migrationFailed' | 'newerSchema' | 'eraseFailed' | 'restoreFailed' | 'closeFailed';
export interface LogFields {
  ids?: readonly string[];
  count?: number;
  errorCode?: ErrorCode;
}

const events = new Set<unknown>(['record_failure', 'rows_skipped']);
const errors = new Set<unknown>(['openFailed', 'integrityFailed', 'migrationFailed', 'newerSchema', 'eraseFailed', 'restoreFailed', 'closeFailed']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** No messages or arbitrary payloads, even from untyped callers in release builds. */
export function logEvent(event: LogEvent, fields?: LogFields): void {
  if (!events.has(event)) return;
  const safe: LogFields = {};
  if (fields && typeof fields === 'object') {
    if (Array.isArray(fields.ids)) safe.ids = fields.ids.filter((id): id is string => typeof id === 'string' && uuid.test(id));
    if (Number.isSafeInteger(fields.count) && fields.count! >= 0) safe.count = fields.count;
    if (errors.has(fields.errorCode)) safe.errorCode = fields.errorCode;
  }
  // The same allowlist in development prevents accidental sensitive debug logging.
  console.info(event, safe);
}
