/**
 * Something that owns app-controlled data delete-all must remove (DATA-3, PHR-1).
 * Owning features export participants through their public `index.ts`; `features/data` lists them.
 * The record directory (database, `-wal`/`-shm`, snapshot, photos, export staging, launch
 * sentinel) and the Query cache are built-in participants of the eraser itself.
 */
export interface EraseParticipant {
  /** Stable identifier, used only in IDs/counts logging. */
  readonly key: string;
  /** Owning feature domain. */
  readonly owner: string;
  /** Stop ingestion, cancel in-flight work and refuse further writes. Called before any removal. */
  quiesce(): Promise<void>;
  /** Absolute file URIs this participant owns outside the record directory. */
  roots?(): Promise<readonly string[]>;
  /** Key-value keys this participant owns. */
  readonly keys?: readonly string[];
  /** Reset in-memory state (stores, caches, module singletons). */
  reset(): Promise<void>;
  /** True only when the in-memory state is verifiably back to its fresh-install value. */
  isClear(): Promise<boolean>;
}
