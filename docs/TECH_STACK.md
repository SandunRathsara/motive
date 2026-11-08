# Motive Tech Stack and Platform Decisions

**Status:** accepted architecture baseline for a new Expo application. The repository had no app or `package.json` when these decisions were recorded on 1 November 2026; installed files are the source of truth for actual versions once bootstrapped.

## 1. Decision register

| Area | Accepted decision | Agent rule |
|---|---|---|
| Application | React Native on the current stable Expo SDK at bootstrap | Use Expo defaults unless a decision record says otherwise. |
| Language | TypeScript with `strict: true` | Keep strictness enabled; fix types at the boundary rather than weakening compiler settings. |
| Routing | Expo Router with `/app` and `/app/_layout.tsx` | Keep routes thin and verify the root layout before provider or layout changes. |
| Styling | NativeWind | Use semantic design tokens and NativeWind classes; no inline-style convention. |
| Remote state | TanStack Query | Query cache owns remote data, request status, retries, and invalidation. |
| Shared client state | Zustand, separate files in `/store` | Use only for state shared across routes/features; never duplicate Query cache into a store. |
| Forms | TanStack Form | Use for complex or multi-step forms; a trivial single-value control may use local state. |
| Validation | Zod | Validate API, native-bridge, persisted, and other untrusted inputs; infer TypeScript types from schemas where useful. |
| Backend | One content-stateless AI proxy on Cloudflare Workers; no other backend (decision record AI-1, §6) | UI and domain logic depend on feature service contracts, not a provider SDK. Follow AI-1 for what may leave the device, consent, authentication, caps and logging. |
| Persistence | Expo SQLite, hand-written SQL migrations, no SQLCipher (decision record PHR-1, §6) | The Personal Health Record is local source of truth; follow PHR-1 for migrations, backup exclusion, export, deletion and recovery. |
| HealthKit | Read-only custom local Swift Expo module `modules/motive-healthkit` (`MotiveHealthKit`), HK-1 and HK-2 (§6) | Only health services reach the native module; validate the bridge and verify on a real device. |
| Platform/build | iOS-first; local Xcode builds with free provisioning until v1, then EAS cloud internal builds (BUILD-1 and its free-provisioning amendment, §6) | Follow BUILD-1 for variants, provisioning and tagged installs; preserve shared-UI portability where it does not add scope. |
| Quality | Typecheck, lint, unit/component, architecture, critical Maestro flows | Create the scripts at bootstrap and run every applicable gate thereafter. |
| Package manager | npm by default; one lockfile | If another manager is selected, update this row and use only its lockfile and commands. |

## 2. Version and dependency protocol

1. Inspect `package.json`, the lockfile, Expo config, and installed native modules before any dependency change.
2. Use the current stable `create-expo-app` TypeScript/Router baseline when bootstrapping a new app. Do not copy an SDK version from this document.
3. Use `npx expo install` for Expo-managed and Expo-compatible native packages so the selected SDK gets compatible versions. Use the chosen package manager for ordinary JavaScript packages.
4. Consult current official documentation before API-specific work. Training-memory API signatures are not sufficient justification for an implementation.
5. Add one dependency for a demonstrated need. Reuse Expo/React Native platform facilities and installed packages first.
6. Do not upgrade adjacent dependencies while implementing an unrelated feature. Do not add a second library for routing, server state, forms, validation, styling, or global client state.
7. After installation, run the relevant typecheck, lint, tests, and native build. Record any intentional version override or native fork in §6.

**Version precedence:** installed lockfile → `package.json` and Expo SDK compatibility → current official documentation → this decision register. Never edit a lockfile by hand.

## 3. Platform and native architecture

### Expo baseline

- Use managed Expo configuration and prebuild; generated `ios/` and `android/` directories are build artifacts unless the project explicitly adopts a different native workflow.
- Use an Expo development build or EAS build for custom native modules, HealthKit entitlements, and config plugins. Expo Go is not the target for those capabilities.
- Keep the React Native New Architecture and other current Expo defaults unless a documented compatibility decision requires a change.
- Centralize cross-feature native/infrastructure setup under `/lib`; place HealthKit-specific adapters in the health feature's service layer.
- A config plugin or native package must be checked against the installed Expo SDK, React Native version, New Architecture, iOS target, and current BUILD-1 native build workflow before adoption.

### HealthKit and Apple Watch gate

HK-1 and HK-2 (§6) resolve the iPhone HealthKit gate with a custom local Expo module. Any change to that selection or any watchOS app needs a new record covering:

- required read/write types and why each is necessary;
- entitlement, usage-description, and config-plugin requirements;
- Expo SDK/New Architecture compatibility and maintenance status;
- read-only-by-default permission scope and handling for unavailable or empty samples;
- provenance model and native-to-TypeScript DTO validation with Zod;
- real-device test plan and whether watchOS is actually required.

Apple Health access requires a native iOS layer. A web fallback, Expo Go, or a JavaScript-only package is not a substitute. Apple Fitness+ content is not a general HealthKit data source. See `docs/REQUIREMENT.md` for product constraints and official Apple references.

## 4. Backend and secrets

The only Phase 1 server is the AI proxy defined by decision record AI-1 (§6). Its model provider is chosen by the AI proxy and provider selection slice (coaching bake-off with the FR-1 meal benchmark) and recorded as an AI-1 amendment; until then, implement only the service contract and a local/mock adapter. Do not scatter placeholder provider calls through the app.

Any backend beyond the AI proxy needs its own decision record naming:

- provider, authentication flow, authorization/ownership rules, and environments;
- service interface and provider-adapter location;
- network DTOs, Zod validation, error mapping, and Query integration;
- data classified as profile, food, workout, health sample, chat, or credentials;
- explicit consent and transport rules for health data;
- deletion/export behavior, retention, logging, and analytics restrictions.

**Secrets:** API keys, service-role credentials, model-provider secrets, and privileged tokens stay server-side. Public client configuration is not a secret store. Health data goes to an AI provider only within the AI-1 Coaching Context and photo rules, and only after the matching AI-1 consent.

## 5. Persistence decision gate

The Personal Health Record store is resolved by decision record PHR-1 in §6. For any other store, persistence is not selected by default. Before adding SQLite, MMKV, AsyncStorage, SecureStore, files, or offline synchronization, record:

1. **Data:** exact entities and whether they contain health or credential data.
2. **Need:** reload persistence, offline reads, offline writes, or secure credential storage.
3. **Ownership:** local source of truth, server source of truth, or cache; conflict and duplicate rules.
4. **Lifecycle:** schema migrations, retention, deletion/export, logout behavior, and backup behavior.
5. **Protection:** platform encryption/secure-storage needs and what must never be logged.
6. **Validation:** Zod schema and corrupt/incompatible stored-data recovery.

Then select the smallest suitable tool. Secure credentials and structured health records are different problems; one storage package is not the default answer to both. Update the decision register before implementation.

## 6. Decision records

Use this section for concise, append-only architecture decisions that change the baseline. Include date, status (`accepted`, `superseded`, `deprecated`), context, decision, consequences, and the superseded decision where applicable. Also update the affected rule elsewhere so this file never contains contradictory active instructions.

Open gates requiring a record before implementation:

- any backend beyond the AI proxy (AI-1);
- any watchOS app;
- the AI model provider, chosen by the AI proxy and provider selection slice's coaching bake-off together with the FR-1 meal benchmark and selection rule, and recorded as an AI-1 amendment (the host and health-data transmission boundary are settled by AI-1; the recognition pipeline and gates by FR-1);
- any inline-style exception;
- any change to package manager or the BUILD-1 native build workflow.

### PHR-1: Personal Health Record persistence and lifecycle

- **Date:** 1 November 2026. **Status:** accepted. **Source:** [Personal Health Record lifecycle](https://github.com/SandunRathsara/motive/issues/7), informed by [On-device storage options for the Personal Health Record](https://github.com/SandunRathsara/motive/issues/5). Resolves the §5 persistence gate for the Personal Health Record.
- **Context:** Phase 1 is a personal-use build for one user. The Personal Health Record lives on-device with no accounts or cloud sync, and Offline Core Logging requires durable local writes.
- **Decision:**
  - **Ownership:** the on-device database is the only source of truth. There is no server copy or conflict resolution.
  - **Engine:** Expo SQLite with hand-written, ordered SQL migrations versioned by `PRAGMA user_version`. Drizzle, MMKV and WatermelonDB are not adopted. Zod validates rows at the repository boundary.
  - **Migrations:** forward-only. Each migration and its version bump commit in one transaction before any consumer mounts. Before migrating, take one SQLite backup snapshot into a backup-excluded directory and keep only the latest. Refuse to open a database with a newer schema, and never delete it. Test every shipped schema version as an upgrade source, including skipped versions.
  - **Backups:** exclude the database, its sidecars, Food Draft photos, snapshots and export staging from iCloud/Finder device backups. Keep durable files out of Caches/tmp. Export is the only off-device copy. Losing the device loses unexported data. There is no in-app restore in Phase 1.
  - **Protection:** iOS Data Protection at the default app class (Complete Until First User Authentication). No SQLCipher. Release builds never log health values, food text, chat content or file paths; logs carry only IDs, counts and error codes. No third-party analytics or crash-reporting SDK in Phase 1.
  - **Retention:** no automatic expiry. A Food Draft persists until confirmed or discarded, and its photo is deleted on either outcome; confirmed entries keep no image. A draft's parsed, grounded line items (matched record and the nutrient values used) persist with the draft so review survives an app restart, per the Food capture contract (issue #8). A confirmed Food Entry keeps its FDC nutrient snapshot permanently (FR-1). Assembled AI payloads, raw recognition/provider responses and export staging are never persisted beyond their operation.
  - **Export:** one versioned JSON file containing export/schema version, timestamp, canonical units, stable IDs and relationships, provenance, and the full record scope: profile, Goals and target history, workouts and sets, food entries, pending Food Drafts as text, health samples, Plan Change history, consents, escalation records, Gate Metrics and coach chat. Pending-draft photos are referenced but not included. There is no CSV. Delivered through the share sheet after a plaintext warning; staging lives in a backup-excluded directory and is cleaned up after use and on the next launch after a crash.
  - **Deletion:**
    - `PRAGMA secure_delete=ON` is set database-wide.
    - **Delete entry** removes the row and any attachment.
    - **Delete all data:**
      1. Stops ingestion and writes, then closes connections.
      2. Removes the database, `-wal` and `-shm` files, photos, snapshots, export staging, key-value state and in-memory state.
      3. Verifies everything is gone before reporting success, and retries after an interruption.
      4. Returns to onboarding.
    - The promise covers only app-controlled data on the device. Apple Health data, already-shared exports, and data the AI provider received under its retention terms are outside it, and the confirmation copy says so.
    - A health signal is turned off in Apple Health's permissions, not in Motive (HK-1). Apple doesn't report the revocation, so cached history is kept and ages out of today-scoped values and trends through the staleness and window rules in [Health signal read set and provenance policy](https://github.com/SandunRathsara/motive/issues/6). "Delete this signal's history" is the explicit way to purge it.
    - A Plan Change keeps an Evidence Snapshot of the aggregates it cited, so deleting an entry never deletes or breaks plan history.
  - **Recovery:** never reset data automatically. If the database fails to open, fails its integrity check, fails migration or has a newer schema, block on a recovery screen offering retry, restore the pre-migration snapshot, share the raw database file, or "Erase and start over" behind a typed confirmation. Rows that fail validation stay on disk, are skipped and are reported as a count. A failed local commit shows the entry as not saved and keeps it editable; nothing is labeled saved before commit.
- **Consequences:** device loss loses unexported data. Exact entity schemas are defined by each slice spec under this contract. Backup exclusion, protection class, migration, interrupted-delete and export cleanup behavior need real-device verification before the Phase 1 Completion Gate.
- **Amendment (1 November 2026, bootstrap foundation):** from [Slice 1](https://github.com/SandunRathsara/motive/issues/19).
  - **Integrity:** `quick_check` on each cold open, timed against UX-7; `integrity_check` before migrating. Detect `newerSchema` before any write-capable PRAGMA, including WAL configuration.
  - **Directory:** Application Support/Motive holds the database, sidecars and latest snapshot, with reserved `photos/` and `export-staging/` directories. `modules/motive-record-directory` is the local Expo native shim (§2 rule 7) for backup exclusion; `lib/native/record-directory.ts` validates its bridge. Exclusion is re-applied and verified on every open. Real Finder-backup verification remains required.
  - **Migration mechanics:** ordered, append-only `{version, sql}` migrations; all pending migrations and their `user_version` bumps commit in one transaction. For existing records only (`user_version > 0`), `VACUUM INTO` writes a temporary snapshot before replacing the latest recovery point; fresh installs take no snapshot. Capture immutable `lib/persistence/__fixtures__/schema-v<N>.sql` fixtures for each shipped schema at a tagged build, following that directory's README; test all fixtures through latest, including skipped versions. `gate_metric.recorded_at` is UTC Unix epoch milliseconds.
  - **Recovery scope:** offer snapshot restore whenever a snapshot exists, including `newerSchema` and `integrityFailed`; warn that restoring discards writes made after the snapshot. Restore writes a durable `restore-pending` marker before staging the retained snapshot as `record.restore.sqlite`, removing the database/sidecars, moving staging into place and clearing the marker. Cold open resumes marked restores before opening SQLite; failure blocks recovery. Erase atomically renames Motive to sibling `Motive.erasing` (backup exclusion moves with it), deletes it and verifies both directories are absent. Open/erase finish and verify pending trash deletion first; failure blocks opening. Until onboarding ships in slice 4, erase returns to the empty shell.
  - **Unclean exits:** slice 1 owns recording, not just Gate Metrics storage. Use a launch-sentinel file in the app-controlled directory, set on active and cleared only on background; a surviving sentinel records `unclean_exit` on the next launch.

- **Amendment (8 November 2026, data control):** from [Slice 2](https://github.com/SandunRathsara/motive/issues/20).
  - **Registries:** features contribute `ExportSection`s and `EraseParticipant`s (`lib/contracts/`) through their public index; `features/data/registry/` lists them. A table-completeness test fails unless every migrated table is claimed by an export section or excluded with a reason (migration bookkeeping only).
  - **Export:** envelope `format: 'motive-personal-health-record'`, `formatVersion` 1 (bumps only on a breaking envelope change; sections version independently), `schemaVersion` (`user_version`), `exportedAt` (ISO-8601 with offset), build identity, canonical units (kg, cm, g, ml, kcal, s, ISO-8601 with offset), `sections` by key and `skippedRowCounts` per section. All sections are read in one record transaction. The file is `export-staging/motive-export-YYYY-MM-DD.json`, with no health values in the name. Staging is removed when the share sheet resolves; an unverifiable removal is a typed `cleanupFailed` result, never success. Every launch sweeps `export-staging/` before `openRecord`, retrying once; a failed sweep is logged and never blocks the record. iOS's share sheet does not report shared versus cancelled.
  - **Delete all:** a durable `Motive.erase-intent` sibling marker (outside the erased set) is written and verified first. Then participants quiesce, `eraseRecord` removes the record tree, participant roots/keys are removed, in-memory state and the Query cache reset, absence is verified and the marker is removed last. Up to 3 attempts, then a blocking "Deletion not finished" state with Retry. A marker found at launch resumes the erase before the opener runs. Retry erases only after this process's explicit confirmation or when a marker exists; otherwise it reopens the intact record. Recovery's typed "Erase and start over" uses the same eraser. `store/record-lifecycle.ts` holds the record phase (`ready`/`exporting`/`erasing`/`erase-blocked`); writes are refused unless ready or exporting. No key-value store exists yet; a participant declaring keys needs an injected key-value adapter.
  - **Query:** the shared client in `lib/query/client.ts` uses `networkMode: 'always'` so local-record queries run offline.
  - **Fault injection:** verification builds only (`isVerification`), from Settings: pause after export staging is written or after the database is deleted, then force-quit.

- **Amendment (8 November 2026, Health Signals):** from [Slice 3](https://github.com/SandunRathsara/motive/issues/21).
  - **Migration v2:** adds `health_sample`, `signal_availability` and `health_sync_anchor`; derived values are computed on read, never stored.
  - **Export:** `healthSignals` v1 covers normalized samples with provenance, availability and anchors as opaque strings. HRV is exported in s (the native/cache unit is ms).
  - **Erase:** the `health` participant quiesces and drains sync before record removal, then resets subscribers and drops the singleton registration.
  - **Singleton:** `features/health/services/health.ts` lazily creates the native adapter and sync service and registers it with `setActiveHealthSync`. Registration subscribes once to post-commit Query invalidation. A fresh record gets a new registered instance; stopped instances are never reused. The root triggers foreground sync only after the record is ready and writes are allowed, without gating rendering.

### HK-1: HealthKit read scope and provenance

- **Date:** 1 November 2026. **Status:** accepted. **Source:** [Health signal read set and provenance policy](https://github.com/SandunRathsara/motive/issues/6), informed by [HealthKit integration approach for Expo](https://github.com/SandunRathsara/motive/issues/2). Records the read types, permission scope, empty-sample handling and provenance parts of the §3 HealthKit gate. HK-2 resolves the native-module selection.
- **Context:** Apple hides read denial: an empty read can't be told apart from denied, missing or unsynced data. Phase 1 has no watchOS app.
- **Decision:**
  - **Scope:** read-only. Read only body mass, workouts, sleep analysis, HRV (SDNN) and resting heart rate. No write types and no `NSHealthUpdateUsageDescription`. No clinical records.
  - **Sync:** foreground only (app open and pull-to-refresh); no background delivery. Anchored queries honor deletions. The first sync backfills 90 days.
  - **Storage:** normalized samples and anchors are cached in the Personal Health Record and fall under PHR-1 export and deletion.
  - **Availability:** per type, only observable states: `unavailableOnDevice`, `notRequested`, `requested` with `hasSamples` / `noReadableSamples` / `queryError`, plus last query and last sample times. Read denial is never inferred.
  - **Provenance DTO:** UUID, type, interval, value with explicit unit (or sleep stage), source bundle ID and name, source revision, optional device, and the user-entered flag. Zod-validated at the health service boundary. A device is never made up from a display name.
- **Consequences:** HK-2 selects the custom Expo module; real-device verification remains required. Adding a type needs a Phase 1 rule that consumes it and a new decision record.

### AI-1: AI proxy and health-data transmission boundary

- **Date:** 1 November 2026. **Status:** accepted; the model provider is pending an amendment. **Source:** [AI data-transmission boundary](https://github.com/SandunRathsara/motive/issues/9), informed by [AI Coach model provider and stateless proxy hosting](https://github.com/SandunRathsara/motive/issues/4) and [Food recognition and nutrition grounding options](https://github.com/SandunRathsara/motive/issues/3). Resolves the health-data transmission part of the AI/model-provider gate and fixes the proxy host.
- **Context:** the Personal Health Record is on-device only (PHR-1). The AI Coach explains; deterministic rules create every Plan Change. Food capture is photo or text, recognized when online. A model provider's "no training" policy is not zero retention.
- **Decision:**
  - **Proxy:** one Cloudflare Worker serves both the AI Coach and food recognition. It is **content-stateless**: it never stores request or response bodies, health values, food text, photos or chat. One Durable Object holds only security and quota state: the enrolled public key, used nonces, the monthly billed-token count and a kill switch. No KV, queues, R2, caches or analytics payloads.
  - **Provider:** OpenAI or Anthropic, called directly from the Worker. One provider serves both uses. It is selected by the coaching bake-off on synthetic fixtures, run in the AI proxy and provider selection slice together with the meal benchmark from [Food recognition provider selection](https://github.com/SandunRathsara/motive/issues/16), under the FR-1 selection rule. The winner and its exact retention terms are recorded as an AI-1 amendment. Bundled food-recognition APIs (Passio, Edamam, fatsecret, LogMeal) are not used. Recognition uses the same provider's vision/text model, grounded in USDA FoodData Central. The FoodData Central lookup receives only a normalized food name.
  - **Retention posture:** accept the provider's standard no-training API retention; zero-retention agreements are not required. Use the provider's no-storage options (for example `store:false`) and no provider-side threads, files, vector stores or hosted retrieval. Keep health facts and evidence IDs out of schema definitions.
  - **Coaching Context**, assembled on the device for each request. Nothing outside it leaves the device for coaching:
    - 28 days of daily aggregates: weight with 7-day trend, sleep per night, HRV/resting HR against baseline, nutrition totals and adherence, plus coverage and known/unknown flags;
    - individual food line items and workout sets only from the last 7 days, or when they are the cited evidence;
    - the Plan Change being explained, with fixed before/after values and its Evidence Snapshot;
    - profile fields only where a rule uses them (Goal, targets, training days, age in years);
    - the current thread's last 6 turns.
  - **Never sent:** raw HealthKit samples, sample UUIDs, source or device names, birth date, names, photos (to the coach), location or stable record IDs. Evidence IDs are local to each request and mapped back on the device.
  - **Chat history:** on-device only, in the Personal Health Record. No provider-side conversation state.
  - **Photos:** sent only to recognition, with the draft's optional caption. Re-encoded with EXIF and location stripped and downscaled (size set by the AI proxy and provider selection slice spec, within the 1.5 MB cap). Never sent to the AI Coach or the food database; never stored by the proxy. Coach questions about a meal use its confirmed line items.
  - **Consent:** two separate one-time consents, **Food recognition** and **AI Coach**, each shown before its first network use. Each names the provider, what is sent, its retention and what works without it. Both are revocable in Settings and asked again when the provider, retention terms or data categories change. There is no per-signal AI exclusion; signals are excluded through Apple Health permissions (HK-1). A "What the coach can see" view shows the last Coaching Context sent.
  - **Authentication:** the app holds an owner-enrolled, non-exportable Secure Enclave P-256 key. Its public key is pinned once in the Worker through `wrangler secret`, and re-enrolled after a reinstall or a new device. Every request signs method, path, body hash, timestamp and nonce. The Worker rejects a bad signature, a timestamp outside ±60 s or a reused nonce before reading the body. No App Attest in Phase 1. No shared or embedded secret.
  - **Secrets and caps:** the provider API key exists only as a Worker secret binding. The app ships no model key, provider SDK or shared secret. The Worker alone fixes the model allowlist, system prompt, output schema and caps: at most 32 KB of text or one image of 1.5 MB or less per request, 600 output tokens, a 30 s upstream timeout and at most one retry. A hard **$10/month** cap is enforced by the Durable Object's billed-token count; the provider's budget alert is only a backstop.
  - **Logging:** Worker observability, invocation logs, tails, Logpush and tracing are off. Bodies, headers, prompts and provider error text are never logged. Before any real data is sent, a synthetic log test (a distinctive fake body and header plus a forced upstream error, with every log surface inspected) must pass.
  - **Model output:** display-only, with no tools or executable payloads. Responses are Zod-validated against a fixed `answer` / `evidenceRefs` / `insufficientData` / `escalation` schema. Evidence refs must exist in that request's Coaching Context, and any quoted Plan Change number must match. Unvalidated prose is never streamed.
  - **Offline and failure:** Plan Changes and their deterministic explanations always work offline. Offline, the chat composer is disabled and questions are not queued. Food Drafts queue offline and are sent on reconnect in the foreground, only if recognition consent is granted, without changing their capture time. Every timeout, refusal, failed validation or reached cap falls back to the deterministic explanation or "insufficient data", with a plain reason.
  - **Declined or revoked consent:** without AI Coach consent, Coach shows only deterministic Plan Change explanations. Without recognition consent, Food Drafts are saved but never sent. They stay pending and never count toward intake, as in the technical-failure state of [Food capture contract](https://github.com/SandunRathsara/motive/issues/8), with a prompt to enable recognition instead of Retry. Phase 1 has no consent-free path to a Food Entry. Revoking consent stops future sends immediately and deletes nothing locally.
  - **Retention copy:** the delete-all and revoke-consent confirmations both say: "Data already sent to [provider] for coaching or food recognition is kept by them for up to 30 days for abuse monitoring, or longer if flagged, and Motive can't recall it. Motive's server keeps none of your health or chat content." Update it in the provider amendment if the selected terms differ.
- **Consequences:** a lost or reinstalled phone needs manual key re-enrollment. The provider amendment, the synthetic log test, the spend cap and the enrollment/replay checks are verified before the Phase 1 Completion Gate.
- **Amendment (1 November 2026, escalation output):** from [Safety escalation triggers and detection](https://github.com/SandunRathsara/motive/issues/17). The coach schema's `escalation` field is `null` or one Warning Sign id from a fixed enum, never a boolean or free text. When it is set, the device discards `answer` and shows that Warning Sign's fixed Escalation Card. Model escalation only adds to the on-device phrase matcher, which runs first, offline and without consent; the model can never clear an on-device match. A message the matcher flags is not sent unless the user overrides with "That's not what I meant". The recognition schema has no escalation field; food text is checked on the device only. Escalation records stay in the Personal Health Record and never enter the Coaching Context.

### FR-1: Food recognition pipeline and provider-selection benchmark

- **Date:** 1 November 2026. **Status:** accepted; the provider is chosen by the benchmark below and recorded in the AI-1 amendment. **Source:** [Food recognition provider selection](https://github.com/SandunRathsara/motive/issues/16), informed by [Food recognition and nutrition grounding options](https://github.com/SandunRathsara/motive/issues/3). Implements the provider-neutral [Food capture contract](https://github.com/SandunRathsara/motive/issues/8) within AI-1.
- **Context:** AI-1 fixes one provider (OpenAI or Anthropic) for coaching and recognition, grounded in USDA FoodData Central (FDC), with no bundled food APIs. Nutrients never come from the model. FDC is US-centred. The Expenditure Estimate reconciles logged intake against the Trend Weight, so a consistent recognition bias largely cancels out, while random error and run-to-run drift do not.
- **Decision:**
  - **Pipeline (in the AI-1 Worker):** (1) The model extracts items from one photo or sentence: name, preparation, portion with grams/ml, assumptions, and for composite dishes a typical ingredient recipe in grams. (2) The Worker queries the FDC API with only normalized food names. The FDC key is a Worker secret. Queries use FNDDS (Survey), Foundation and SR Legacy, and Branded only when the input names a brand. (3) A second, constrained model call picks each item's match only from the returned candidate FDC IDs (an enum), so an FDC ID can never be invented. The top 3 are kept as the stored alternatives. (4) Nutrients are computed deterministically from the matched records' stated basis and the accepted quantity. There is no on-device FDC snapshot.
  - **Recipe Estimate:** when no acceptable direct dish match exists, the item's nutrients are summed from its FDC-matched recipe ingredients. It stays one item, shows its assumed recipe, and carries a **Check** badge ("estimated from a typical recipe"). Portion chips scale the whole recipe. Ingredients the recipe can't ground are unknown ("—"), never zero.
  - **Snapshot and attribution:** FDC data is CC0. Each Food Entry item permanently keeps its FDC ID, data type, publication version, nutrient values per 100 g and gram conversion. These are included in the export and survive any provider change. Settings > About credits "USDA FoodData Central".
  - **Spend:** recognition is budgeted at ≤ $4/month (about 150 captures including retries) and ≤ about $0.025/capture across both model calls, leaving ≥ $6 of the AI-1 $10 cap for coaching.
  - **Latency:** recognition wait (send → review-ready, including both model calls, FDC lookups and network) is a gate: median ≤ 8 s, 95th percentile ≤ 20 s on the benchmark over normal Wi-Fi/LTE. Capture-to-confirmed is reported as active input time plus recognition wait, and is not gated on its own. The app ends a recognition attempt after 45 s overall, into the Food capture contract's "Couldn't process yet" state.
  - **Accuracy gates (pass/fail on the benchmark):** repeatability kcal coefficient of variation ≤ 10% per meal across 3 runs; after ≤ 1 correction, median per-meal absolute error ≤ 20% for kcal and ≤ 25% for protein; ≤ 25% of meals need more than one correction; ≤ 10% of items end with unknown nutrients. Uncorrected error and signed bias are reported, not gated.
  - **Benchmark protocol:** this runs in the AI proxy and provider selection slice, before the app-side recognition and AI Coach slices, through the real Worker pipeline with both provider adapters, pinned model versions, prompts and schemas, on a separate dev Worker environment with a one-off $25 cap (outside the $10/month personal cap).
    0. The owner lists their frequent dishes, cuisines and brands. Each is checked for an FDC direct match or Recipe Estimate coverage before any meals are collected. A cuisine must work if it is about 10% or more of meals.
    1. Collect 40 real meals over about 2 weeks, in proportion to the owner's mix, including mixed dishes, large portions, oils/sauces and drinks. Each meal is entered as a photo with no caption and as a one-sentence description (80 inputs per provider).
    2. At least 30 meals are weighed per component. The reference nutrients come from those weights and owner-selected FDC records. Up to 10 unweighed restaurant/takeaway meals are scored on identity and correction burden only.
    3. The owner writes one correction sentence per meal before running. Both providers receive the same sentence.
    4. 10 meals are run 3 times per input per provider for repeatability.
    5. Report item precision/recall, match correctness, portion error, kcal and protein error and bias, unknown rate, correction burden, latency percentiles, tokens and per-capture cost.
    The benchmark measures recognition and matching against FDC, not FDC's own accuracy. Real meals are sent under the recognition consent and AI-1's accepted retention.
  - **Selection rule:** the recognition gates above and the coaching bake-off's gates are pass/fail. Among providers that pass both, the coaching bake-off score picks the winner; lower cost breaks a tie. If no provider passes recognition, the slice stops and returns to the roadmap; the bar is not relaxed silently.
- **Consequences:** recognition costs two model calls per capture. FDC availability becomes a runtime dependency of recognition, not of reviewing stored entries. The Food capture contract's "nutrients come only from a matched database record" reads as "matched database record(s)". The provider is recorded in the AI-1 amendment with its measured results.

### BUILD-1: Native builds, variants and installed-build identity

- **Date:** 1 November 2026. **Status:** accepted. **Source:** [Slice 1](https://github.com/SandunRathsara/motive/issues/19). Resolves the native build workflow gate.
- **Context:** owner dogfood must survive beyond free provisioning, and destructive verification must not touch the owner's record. Older installed builds must be reproducible as upgrade sources.
- **Decision:**
  - **Distribution:** EAS cloud builds, ad hoc internal distribution to the registered iPhone UDID under the owner's paid Apple Developer account. `eas.json` defines `development` (owner development client), `owner` (standalone internal) and `verification` (standalone internal).
  - **Variants:** `app.config.ts` selects `owner` or `verification`. Bundle IDs are `dev.motive.app` and `dev.motive.app.verification`; names are Motive and Motive Verify; icons differ; schemes are `motive` and `motive-verification`. Each has its own sandbox and, when HealthKit ships, its own grant. `APP_VARIANT` and `EXPO_PUBLIC_APP_VARIANT` must agree; `lib/build.ts` exposes compile-time `isVerification` through the inlined public variable so owner builds can eliminate verification-only branches.
  - **Worker slot:** `OWNER_WORKER_URL` / `VERIFICATION_WORKER_URL` populate the selected public `extra.workerUrl`, exposed by `lib/build.ts`. Slice 7 supplies the endpoints; verification uses FR-1's dev Worker.
  - **Identity:** build ID `<version>+<buildNumber>`, exposed by `lib/build.ts`, matches tag `build/<variant>/<version>+<buildNumber>` on every installed build. `scripts/release-version.json` is the committed version source; EAS uses local versions with auto-increment off so rebuilding a tag retains its identity instead of taking remote version state.
  - **Release:** `npm run release -- <owner|verification> [--dry-run]` invokes `scripts/release.mjs`. It refuses a dirty tree or an existing target tag, increments and commits the build number, then runs the matching EAS iOS profile and waits. Only success with a still-clean tree and unchanged HEAD creates the annotated tag. A failed build retains the build-number commit without a tag. It prints `git push origin <tag>` rather than pushing. Dry-run validates and prints the plan/push command without writing, building or tagging; the development-client profile is not handled by this script. The root `justfile` is the entry point: `just release` runs `npm run release -- owner` and `just release --verify` runs `npm run release -- verification`. It uses just's `[arg(..., long)]` flag syntax and so needs a recent `just` (verified on 1.59.0); `npm run release` stays the underlying contract.
  - **Owner provisioning:** manually run `eas login` and `eas init`, commit the resulting `extra.eas.projectId` in `app.config.ts`, register the iPhone with `eas device:create`, and authorize paid-account signing credentials. Use the release workflow for standalone installs, install the correct variant, and push its tag. A development-client install must also receive its matching build tag before installation.
- **Consequences:** device registration, credentials, cloud builds, installation and tag pushes need owner access. Configured profiles alone are not evidence of a successful installed build; device checks remain in the slice checklist.
- **Amendment (8 November 2026, free provisioning until v1):** from [Slice 1](https://github.com/SandunRathsara/motive/issues/19).
  - **Context:** the owner has no personal paid Apple Developer account. The only paid team their Apple ID belongs to is their employer's, and Motive must never be signed, registered or distributed under it. A personal paid account is deferred until v1.
  - **Decision:** until v1, builds are local Xcode builds signed by the owner's free **Personal Team**, installed over USB. The release script runs `expo prebuild --platform ios --clean` and `expo run:ios --device --configuration Release --no-bundler` with the variant environment, then tags as before; build identity, variants and tags are unchanged. The owner picks the Personal Team at the signing prompt, never an employer team. `eas.json` and the linked EAS project (`@marvellous-tech/motive`) are kept for the switch back but are not used to build or register devices. `package.json` `ios`/`android` scripts use `expo run:*` so prebuild does not rewrite them and dirty the tree.
  - **Consequences:** free provisioning profiles expire after 7 days; the owner reinstalls by running a new release over the same bundle ID, which keeps the app's data (deleting the app does not). Free teams allow at most 3 sideloaded apps per device and need Developer Mode on the iPhone. Capability availability on free teams (notably HealthKit, slice 3) must be confirmed before that slice. Switching to EAS at v1 needs a further amendment and a personal paid account.

### Bootstrap simulator amendments (3 November 2026)

- **Newer-schema preservation:** device opens first inspect a disposable database/WAL copy in the backup-excluded Motive directory. Even reading `user_version` on the original through SQLite can delete sidecars on close. The probe includes uncheckpointed WAL writes, is removed after inspection, and refuses newer versions before opening the original. This adds local copy I/O to cold open; real-device UX-7 timing remains required.

### Bootstrap device findings (8 November 2026)

- **Unclean exits:** on a real iPhone, swipe-killing from the app switcher delivers `background` before termination, so it clears the launch sentinel and records nothing. This is intended: `unclean_exit` is crash evidence (REQUIREMENT §10b), and a user force-quit is not a crash. Verify recording by sending `SIGKILL` to the foreground process (`xcrun devicectl device process signal --signal SIGKILL`), then relaunching; one row with the killed build's ID is expected.

### HK-2: HealthKit native module

- **Date:** 8 November 2026. **Status:** accepted. **Source:** [Slice 3: Health Signals](https://github.com/SandunRathsara/motive/issues/21). Closes the §3 iPhone HealthKit library gate.
- **Context:** HK-1 fixes exactly five read types, foreground anchored sync and provenance. The owner selects option B rather than `@kingstinct/react-native-healthkit`.
- **Decision:** a custom Swift Expo module at `modules/motive-healthkit`, Expo module name `MotiveHealthKit`. It exposes only:
  - `isAvailable()`;
  - `requestReadAuthorization()`, with an empty share set and exactly the five HK-1 read types: `bodyMass`, `heartRateVariabilitySDNN`, `restingHeartRate`, `sleepAnalysis`, `workoutType`;
  - `requestStatus(type)`, using per-type `getRequestStatusForAuthorization` with an empty share set and that one read type;
  - `anchoredFetch(type, anchor, startMs, limit)`, using paged `HKAnchoredObjectQuery`; returns raw samples, deleted UUIDs, a new opaque anchor (`NSKeyedArchiver`, base64) and `hasMore`.
  - Units are kg, ms and count/min. Device fields come from `HKDevice` only, never inferred from a name. The user-entered flag comes from `HKMetadataKeyWasUserEntered`. Workouts carry only interval and activity type.
- **Config:** the module's local config plugin adds `com.apple.developer.healthkit` and `NSHealthShareUsageDescription`. No `NSHealthUpdateUsageDescription`, `com.apple.developer.healthkit.background-delivery` or clinical-records access. The podspec links `HealthKit.framework`. Inspect prebuild output to confirm this scope.
- **Why:** a minimal surface matching HK-1 exactly, without plugin defaults that add write strings or background delivery, without Nitro, and following the existing `motive-record-directory` local-module pattern.
- **Boundary:** only `features/health/services/` may reach the native module, enforced by the architecture check. The TypeScript wrapper validates the envelope; the health sync service Zod-validates each sample's provenance DTO, skipping and counting invalid samples.
- **Consequences:** real-device verification (issue #21's Device Checklist) remains required; mocks are not HealthKit evidence. Anchors are opaque strings in export.

## 7. Quality gates

`package.json` owns the executable commands. `verify` runs the following five gates in order and stops at the first failure; absence or non-execution of a gate is not a pass.

| Gate | Required scope |
|---|---|
| `typecheck` | Strict TypeScript across app, source, tests, and config included by the project. |
| `lint` | Expo ESLint configuration plus `no-console` (only `lib/logger.ts` is exempt) and a JSX `style` attribute ban. |
| `test` | Jest and React Native Testing Library for changed logic and important component behavior. |
| `architecture` | Repeatable checks for forbidden imports, store placement, provider SDK leakage, and inline styles. |
| `test:e2e` | `maestro test .maestro`, iOS simulator only; native HealthKit paths also require real-device verification. |

- Tests are colocated as `*.test.ts(x)` (ARCHITECTURE §2); `jest.config.js` discovers both extensions. Migration tests use Node's built-in `node:sqlite` through `lib/persistence/testing/node-executor.ts`, with no added SQL-engine dependency; this adapter is test-only.
- `scripts/check-architecture.mjs` invokes `scripts/architecture/check.mjs`, whose source comments cite ARCHITECTURE §3–§5. Rule IDs: `provider-sdk`, `healthkit-boundary`, `native-share`, `store-placement`, `import-boundary`, `feature-jsx`, `inline-style`, `store-count`, `console-usage`. Fixture tests under `scripts/architecture/` verify rejection. The checker also rejects `StyleSheet.create`; lint and architecture rules must stay aligned with the documented boundaries.
- A feature is done only when applicable gates pass and unrun gates are explicitly reported.

## 8. Official references for implementation work

Consult the current version before changing APIs or configuration:

- Expo and development builds — https://docs.expo.dev/
- Expo Router — https://docs.expo.dev/router/introduction/
- NativeWind — https://www.nativewind.dev/
- Zustand — https://zustand.docs.pmnd.rs/
- TanStack Query — https://tanstack.com/query/latest
- TanStack Form — https://tanstack.com/form/latest
- Zod — https://zod.dev/
- React Native Testing Library — https://callstack.github.io/react-native-testing-library/
- Maestro — https://docs.maestro.dev/
- Apple HealthKit — https://developer.apple.com/documentation/healthkit
