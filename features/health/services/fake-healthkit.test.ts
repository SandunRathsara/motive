import { FakeHealthKitAdapter } from './fake-healthkit';
import type { HealthSampleDto } from '../health.schemas';

function weight(uuid: string, value: number): HealthSampleDto {
  return {
    uuid, type: 'bodyMass', value, unit: 'kg', startMs: 1_000, endMs: 1_000,
    source: { bundleId: 'test.scale', name: 'Scale' }, sourceRevision: {}, device: null, userEntered: false,
  };
}

test('refuses to fetch before authorization was requested', async () => {
  const healthkit = new FakeHealthKitAdapter();
  await expect(healthkit.anchoredFetch('bodyMass', { anchor: null, startMs: null, limit: 100 }))
    .rejects.toThrow('Authorization has not been requested');
});

test('pages samples, then returns only edits and deletions since the saved anchor', async () => {
  const healthkit = new FakeHealthKitAdapter();
  const first = weight('A7453A19-09DB-4F31-8D82-542B13D8BE81', 75);
  const second = weight('A7453A19-09DB-4F31-8D82-542B13D8BE82', 76);
  healthkit.addSample(first);
  healthkit.addSample(second);
  await healthkit.requestReadAuthorization();

  const input = { anchor: null, startMs: 0, limit: 1 };
  const page1 = await healthkit.anchoredFetch('bodyMass', input);
  expect(page1).toEqual({ samples: [first], deletedUuids: [], anchor: expect.any(String), hasMore: true });
  const page2 = await healthkit.anchoredFetch('bodyMass', { ...input, anchor: page1.anchor });
  expect(page2).toEqual({ samples: [second], deletedUuids: [], anchor: expect.any(String), hasMore: false });

  const edited = { ...first, value: 74 };
  healthkit.editSample(edited);
  healthkit.deleteSample('bodyMass', second.uuid);
  const changes = await healthkit.anchoredFetch('bodyMass', { ...input, anchor: page2.anchor, limit: 100 });
  expect(changes).toEqual({ samples: [edited], deletedUuids: [second.uuid], anchor: expect.any(String), hasMore: false });
  const unchanged = await healthkit.anchoredFetch('bodyMass', { ...input, anchor: changes.anchor });
  expect(unchanged).toEqual({ samples: [], deletedUuids: [], anchor: changes.anchor, hasMore: false });
});
