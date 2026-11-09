export type WorkoutsErrorCode =
  | 'readFailed' | 'writeFailed' | 'invalidState' | 'invalidRows' | 'notFound' | 'activeSessionExists' | 'recordWritesBlocked';

/** Typed domain error: carries a code and a count only, never SQL, paths or row contents. */
export class WorkoutsError extends Error {
  constructor(readonly code: WorkoutsErrorCode, readonly skippedCount = 0) { super(code); this.name = 'WorkoutsError'; }
}
