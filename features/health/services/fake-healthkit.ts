/** Test-only adapter: never import this module from production source. */
import type { HealthKitPage, HealthSampleDto } from '../health.schemas';
import type { HealthSignalType } from '../health.types';
import type { HealthKitAdapter, HealthKitRequestStatus } from './healthkit.contract';

type Change = { revision: number } & ({ sample: unknown } | { deletedUuid: string });

export class FakeHealthKitAdapter implements HealthKitAdapter {
  available = true;
  authorizationRequested = false;
  readonly requestStatuses: Partial<Record<HealthSignalType, HealthKitRequestStatus>> = {};
  readonly queryFailures: Partial<Record<HealthSignalType, boolean>> = {};
  private revision = 0;
  private readonly changes = new Map<HealthSignalType, Map<string, Change>>();

  /** Add/edit through these methods rather than mutating supplied objects in place. */
  addSample(sample: HealthSampleDto): void { this.injectRawSample(sample.type, sample); }
  editSample(sample: HealthSampleDto): void { this.addSample(sample); }

  deleteSample(type: HealthSignalType, uuid: string): void {
    this.record(type, uuid, { deletedUuid: uuid });
  }

  /** Bypasses the sample schema so sync tests can exercise skip counts. */
  injectRawSample(type: HealthSignalType, sample: unknown): void {
    const uuid = typeof sample === 'object' && sample !== null && 'uuid' in sample && typeof sample.uuid === 'string'
      ? sample.uuid : `malformed:${this.revision + 1}`;
    this.record(type, uuid, { sample });
  }

  private record(type: HealthSignalType, uuid: string, change: { sample: unknown } | { deletedUuid: string }): void {
    let samples = this.changes.get(type);
    if (!samples) {
      samples = new Map();
      this.changes.set(type, samples);
    }
    samples.set(uuid, { ...change, revision: ++this.revision });
  }

  async isAvailable(): Promise<boolean> { return this.available; }

  async requestReadAuthorization(): Promise<void> {
    if (!this.available) throw new Error('HealthKit unavailable');
    this.authorizationRequested = true;
  }

  async requestStatus(type: HealthSignalType): Promise<HealthKitRequestStatus> {
    return this.requestStatuses[type] ?? (this.authorizationRequested ? 'unnecessary' : 'shouldRequest');
  }

  async anchoredFetch(type: HealthSignalType, input: {
    anchor: string | null; startMs: number | null; limit: number;
  }): Promise<HealthKitPage> {
    if (!this.authorizationRequested) throw new Error('Authorization has not been requested');
    if (!this.available) throw new Error('HealthKit unavailable');
    if (this.queryFailures[type]) throw new Error('HealthKit query failed');
    if (!Number.isSafeInteger(input.limit) || input.limit < 1) throw new Error('Invalid page limit');
    const prefix = `fake:${type}:`;
    const cursor = input.anchor === null ? 0 : Number(input.anchor.slice(prefix.length));
    if (input.anchor !== null && (!input.anchor.startsWith(prefix) ||
      !/^\d+$/.test(input.anchor.slice(prefix.length)) || !Number.isSafeInteger(cursor) || cursor > this.revision)) {
      throw new Error('Invalid fake anchor');
    }
    // Keep the latest change per UUID, including deletion tombstones, like a current HealthKit store.
    const changes = [...(this.changes.get(type)?.values() ?? [])].filter((change) => {
      if (change.revision <= cursor) return false;
      if (!('sample' in change) || input.startMs === null) return true;
      const sample = change.sample;
      // Malformed timestamps must reach sync's validator rather than disappear in the fake.
      return typeof sample !== 'object' || sample === null || !('endMs' in sample) ||
        typeof sample.endMs !== 'number' || !Number.isFinite(sample.endMs) || sample.endMs >= input.startMs;
    }).sort((a, b) => a.revision - b.revision);
    const page = changes.slice(0, input.limit);
    const hasMore = changes.length > page.length;
    return {
      samples: page.flatMap((change) => 'sample' in change ? [change.sample] : []),
      deletedUuids: page.flatMap((change) => 'deletedUuid' in change ? [change.deletedUuid] : []),
      anchor: `${prefix}${hasMore ? page[page.length - 1].revision : this.revision}`,
      hasMore,
    };
  }
}
