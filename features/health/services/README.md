# Health ingestion boundary

`createHealthSync` is provider-neutral. App composition supplies the adapter and
calls `setActiveHealthSync(instance)` once for its singleton. The health erase
participant stops/drains that instance before the record is removed, then resets
subscriptions and drops the registration. An erased instance stays stopped;
create and register a new instance after the fresh record opens. Registering a
second live singleton is rejected rather than leaving ingestion outside erasure.

Authorization request status is not read authorization. `unnecessary` means the
request has already been made; `shouldRequest` and `unknown` are conservatively
`notRequested`, and neither permits a query. `connect` requests the five read types
before checking per-type request status. Empty results never imply read denial.

If `requestStatus` throws, retain the previously persisted request state. A
previously `requested` type records `queryError` and the attempt's current query
time, retaining its last sample time. Other prior states are unchanged. With no
prior row, leave the row absent and return `availability: null` plus a typed
`queryFailed` error: failure is not evidence of `notRequested` or `requested`.
The read view still offers Connect conservatively for an absent row; mutation
feedback reports the failed attempt.

Before syncing a type, validate its availability and anchor rows separately from
missing rows. An existing invalid row refuses that type with `invalidStoredData`
and its persisted-row `skippedCount`; do not fetch, overwrite, reset or delete it.
Other types continue normally. Repeated reads, refreshes and export retain the
same skipped count until an explicit data-control action changes the record.
Availability-write failures are also isolated per type and return the last
validated committed state (or null), never an uncommitted replacement. Failures
before per-type work return an overall `queryFailed` with no invented type rows.

The first authorized attempt fixes the 90-day lower bound even if its query
fails. Every subsequent page retains that predicate and commits adds, deletes and
its new opaque anchor together only when raw samples (including validation skips)
or deleted UUIDs were returned. Empty pages never advance the stored anchor:
HealthKit hides read denial and can still return a current cursor, which would
skip history after access is restored. A committed page emits its type; availability
changes also emit after persistence, so subscribers must tolerate repeated types.
Callbacks cannot roll back commits. Sync and history deletion are serialized;
native calls cannot be interrupted by this adapter contract, so stopping discards
their pending results and waits for them before permitting erase.

The `healthSignals` v1 export has discriminated `sample`, `availability` and
`anchor` records. Sample IDs and provenance are retained, HRV ms becomes seconds,
and all timestamps (including the backfill bound) use ISO-8601 with numeric offset.
Anchors are opaque strings, never decoded by the repository or serializer.

## App and read contracts

`getHealthSync()` lazily constructs and registers the native singleton; the erase
participant owns that registration. Registration subscribes once to post-commit
invalidation of `healthKeys.all` on the shared Query client. The root's
`useHealthSyncOnOpen(enabled)` triggers only when the record permits writes, and
invalidates time-sensitive reads on each foreground return without awaiting sync.
`refreshOnOpenAttempted()` snapshots the latest open-triggered attempt's completion
promise for reviews. Each `sync('open')` renews the barrier, including foreground
returns and opens sharing an in-flight refresh. Call it after triggering open to
wait for that attempt, regardless of success, failure, refusal or interruption.
Earlier callers keep their original snapshot; later opens do not extend it.
Before any open has been triggered it resolves immediately, rather than waiting
forever for an attempt that may never start. This barrier never gates rendering.

Other slices use only these read-only exports from `features/health`:

- `getDailyWeights(range, context?)`: inclusive 04:00-local days, known/unknown
  values and coverage, with stable selected sample IDs in provenance.
- `getTrendWeight(day, context?)`: seven-day Trend Weight for any signal day.
- `getHealthWorkouts({ from, to }, context?)`: inclusive interval overlap, stable
  local IDs, known/unknown and day coverage. No workout linking in this slice.
- `getHealthCoachingContext(context?)`: exactly 28 daily aggregate rows, with
  coverage, known/unknown flags and explicit units. No provenance, UUIDs, stable
  IDs, source names or device fields may cross this AI-1 boundary.
- `getHealthEvidenceContext(context?)`: last-seven and baseline aggregates with
  coverage and the literal label `not used in the decision`. The caller persists
  the returned snapshot; later corrections/deletions do not mutate that object.

Contexts default to `Date.now()` and the device time zone at read time; injected
contexts support deterministic tests and historical evidence. Failed record reads
reject with a safe typed `HealthReadError` (`kind: 'readFailed'`), never a fabricated
unknown/zero or a native/storage error message.
