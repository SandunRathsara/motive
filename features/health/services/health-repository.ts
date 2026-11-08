import { parseRows, requireRecord, type SqlConnection, type SqlExecutor } from '@/lib/persistence';
import { recordWritesAllowed } from '@/store/record-lifecycle';
import { healthSampleDtoSchema, healthSampleRowSchema, healthSyncAnchorRowSchema, signalAvailabilityRowSchema, type HealthSampleDto } from '../health.schemas';
import type { HealthSignalType, SignalAvailability } from '../health.types';

export interface HealthSyncAnchor { type: HealthSignalType; anchor: string | null; backfillStartMs: number }

function assertWritesAllowed(): void {
  if (!recordWritesAllowed()) throw Object.assign(new Error('Record writes are blocked'), { code: 'recordWritesBlocked' });
}

// SQLite generates UUIDs: Hermes need not implement Web Crypto. Conflict updates never replace id.
const localIdSql = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random() % 4) + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6)))`;
const columns = ['hk_uuid', 'type', 'start_ms', 'end_ms', 'value', 'unit', 'sleep_stage', 'activity_type',
  'source_bundle_id', 'source_name', 'source_version', 'source_product_type', 'source_os_version',
  'device_present', 'device_model', 'device_manufacturer', 'device_hardware_version', 'device_software_version', 'device_name', 'user_entered'];

/** Pass the transaction connection when composing atomic page commits or export snapshots. */
export function createHealthRepository(connection?: SqlConnection) {
  const db = () => connection ?? requireRecord();
  return {
    async upsertSamples(samples: readonly HealthSampleDto[]): Promise<void> {
      assertWritesAllowed();
      for (const input of samples) {
        assertWritesAllowed();
        const sample = healthSampleDtoSchema.parse(input);
        await db().run(`INSERT INTO health_sample (id, ${columns.join(', ')}) VALUES (${localIdSql}, ${columns.map(() => '?').join(', ')})
          ON CONFLICT(hk_uuid) DO UPDATE SET ${columns.filter((column) => column !== 'hk_uuid').map((column) => `${column} = excluded.${column}`).join(', ')}`, [
          sample.uuid, sample.type, sample.startMs, sample.endMs,
          'value' in sample ? sample.value : null, 'unit' in sample ? sample.unit : null,
          sample.type === 'sleep' ? sample.stage : null, sample.type === 'workout' ? sample.activityType : null,
          sample.source.bundleId, sample.source.name, sample.sourceRevision.version ?? null,
          sample.sourceRevision.productType ?? null, sample.sourceRevision.osVersion ?? null,
          sample.device === null ? 0 : 1, sample.device?.model ?? null, sample.device?.manufacturer ?? null,
          sample.device?.hardwareVersion ?? null, sample.device?.softwareVersion ?? null, sample.device?.name ?? null,
          sample.userEntered ? 1 : 0,
        ]);
      }
    },
    async deleteByUuids(type: HealthSignalType, uuids: readonly string[]): Promise<void> {
      assertWritesAllowed();
      // One bound statement per UUID avoids SQLite's variable limit on large deletion pages.
      for (const uuid of uuids) {
        assertWritesAllowed();
        await db().run('DELETE FROM health_sample WHERE type = ? AND hk_uuid = ?', [type, uuid]);
      }
    },
    async purgeType(type: HealthSignalType): Promise<void> {
      assertWritesAllowed();
      const purge = async (tx: SqlConnection) => {
        assertWritesAllowed();
        await tx.run('DELETE FROM health_sample WHERE type = ?', [type]);
        await tx.run('DELETE FROM health_sync_anchor WHERE type = ?', [type]);
        assertWritesAllowed();
      };
      const connection = db();
      if ('transaction' in connection) await (connection as SqlExecutor).transaction(purge);
      else await purge(connection);
    },
    /** Inclusive interval overlap; omitting the range reads all retained history. */
    async listSamples(type?: HealthSignalType, range?: { from: number; to: number }) {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (type) { where.push('type = ?'); params.push(type); }
      if (range) { where.push('end_ms >= ? AND start_ms <= ?'); params.push(range.from, range.to); }
      return parseRows(healthSampleRowSchema, await db().getAll(`SELECT * FROM health_sample${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY start_ms, id`, params));
    },
    async listAnchors(type?: HealthSignalType) {
      return parseRows(healthSyncAnchorRowSchema, await db().getAll(`SELECT * FROM health_sync_anchor${type ? ' WHERE type = ?' : ''} ORDER BY type`, type ? [type] : []));
    },
    async listAvailability(type?: HealthSignalType) {
      return parseRows(signalAvailabilityRowSchema, await db().getAll(`SELECT * FROM signal_availability${type ? ' WHERE type = ?' : ''} ORDER BY type`, type ? [type] : []));
    },
    async setAvailability(availability: SignalAvailability): Promise<void> {
      assertWritesAllowed();
      await db().run(`INSERT INTO signal_availability (type, state, read_state, last_query_at, last_sample_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(type) DO UPDATE SET state = excluded.state, read_state = excluded.read_state,
          last_query_at = excluded.last_query_at, last_sample_at = excluded.last_sample_at`,
      [availability.type, availability.state, availability.readState, availability.lastQueryAt, availability.lastSampleAt]);
    },
    async setAnchor(anchor: HealthSyncAnchor): Promise<void> {
      assertWritesAllowed();
      await db().run(`INSERT INTO health_sync_anchor (type, anchor, backfill_start_ms) VALUES (?, ?, ?)
        ON CONFLICT(type) DO UPDATE SET anchor = excluded.anchor, backfill_start_ms = excluded.backfill_start_ms`,
      [anchor.type, anchor.anchor, anchor.backfillStartMs]);
    },
  };
}
