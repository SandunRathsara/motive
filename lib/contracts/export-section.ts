import type { SqlConnection } from '@/lib/persistence';

/** Records a section reader returns: Zod-validated, canonical units, stable and relationship IDs. */
export interface ExportSectionRead<T = unknown> {
  records: readonly T[];
  /** Rows that failed validation: skipped (DATA-6), never silently dropped. */
  skippedCount: number;
}

/**
 * One feature's slice of the Personal Health Record export (DATA-4, PHR-1).
 * Owning features export sections through their public `index.ts`; `features/data` lists them.
 * Readers never return file paths: photo references are opaque IDs.
 */
export interface ExportSection<T = unknown> {
  /** Stable envelope key; never renamed once shipped. */
  readonly key: string;
  /** Bumps independently of the envelope format version. */
  readonly version: number;
  /** Owning feature domain, for example `metrics`. */
  readonly owner: string;
  /** Tables whose rows this section exports; checked by the table-completeness test. */
  readonly tables: readonly string[];
  /** Runs inside the export's single read transaction; use only the supplied connection. */
  read(tx: SqlConnection): Promise<ExportSectionRead<T>>;
}
