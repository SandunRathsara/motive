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
| Platform | iOS-first with portable shared UI | Use Expo development builds/EAS for native capabilities; preserve Android portability where it does not add scope. |
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
- A config plugin or native package must be checked against the installed Expo SDK, React Native version, New Architecture, iOS target, and EAS build before adoption.

### HealthKit and Apple Watch gate

Before selecting a HealthKit library or writing a native module, record:

- required read/write types and why each is necessary;
- entitlement, usage-description, and config-plugin requirements;
- Expo SDK/New Architecture compatibility and maintenance status;
- read-only-by-default permission scope and handling for unavailable or empty samples;
- provenance model and native-to-TypeScript DTO validation with Zod;
- real-device test plan and whether watchOS is actually required.

Apple Health access requires a native iOS layer. A web fallback, Expo Go, or a JavaScript-only package is not a substitute. Apple Fitness+ content is not a general HealthKit data source. See `docs/REQUIREMENT.md` for product constraints and official Apple references.

## 4. Backend and secrets

The only Phase 1 server is the AI proxy defined by decision record AI-1 (§6). Its model provider is chosen by the AI slice's bake-off with the FR-1 meal benchmark and recorded as an AI-1 amendment; until then, implement only the service contract and a local/mock adapter. Do not scatter placeholder provider calls through the app.

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
- HealthKit library versus custom native module, and any watchOS app;
- the AI model provider, chosen by the AI slice's coaching bake-off together with the FR-1 meal benchmark and selection rule, and recorded as an AI-1 amendment (the host and health-data transmission boundary are settled by AI-1; the recognition pipeline and gates by FR-1);
- any inline-style exception;
- any change to package manager or native build workflow.

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
  - **Export:** one versioned JSON file containing export/schema version, timestamp, canonical units, stable IDs and relationships, provenance, and the full record scope: profile, Goals and target history, workouts and sets, food entries, pending Food Drafts as text, health samples, insights, Plan Change history and coach chat. Pending-draft photos are referenced but not included. There is no CSV. Delivered through the share sheet after a plaintext warning; staging lives in a backup-excluded directory and is cleaned up after use and on the next launch after a crash.
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

### HK-1: HealthKit read scope and provenance

- **Date:** 1 November 2026. **Status:** accepted. **Source:** [Health signal read set and provenance policy](https://github.com/SandunRathsara/motive/issues/6), informed by [HealthKit integration approach for Expo](https://github.com/SandunRathsara/motive/issues/2). Records the read types, permission scope, empty-sample handling and provenance parts of the §3 HealthKit gate. The library choice stays open.
- **Context:** Apple hides read denial: an empty read can't be told apart from denied, missing or unsynced data. Phase 1 has no watchOS app.
- **Decision:**
  - **Scope:** read-only. Read only body mass, workouts, sleep analysis, HRV (SDNN) and resting heart rate. No write types and no `NSHealthUpdateUsageDescription`. No clinical records.
  - **Sync:** foreground only (app open and pull-to-refresh); no background delivery. Anchored queries honor deletions. The first sync backfills 90 days.
  - **Storage:** normalized samples and anchors are cached in the Personal Health Record and fall under PHR-1 export and deletion.
  - **Availability:** per type, only observable states: `unavailableOnDevice`, `notRequested`, `requested` with `hasSamples` / `noReadableSamples` / `queryError`, plus last query and last sample times. Read denial is never inferred.
  - **Provenance DTO:** UUID, type, interval, value with explicit unit (or sleep stage), source bundle ID and name, source revision, optional device, and the user-entered flag. Zod-validated at the health service boundary. A device is never made up from a display name.
- **Consequences:** library selection (Kingstinct versus a custom Expo module) and real-device verification remain an open gate. Adding a type needs a Phase 1 rule that consumes it and a new decision record.

### AI-1: AI proxy and health-data transmission boundary

- **Date:** 1 November 2026. **Status:** accepted; the model provider is pending an amendment. **Source:** [AI data-transmission boundary](https://github.com/SandunRathsara/motive/issues/9), informed by [AI Coach model provider and stateless proxy hosting](https://github.com/SandunRathsara/motive/issues/4) and [Food recognition and nutrition grounding options](https://github.com/SandunRathsara/motive/issues/3). Resolves the health-data transmission part of the AI/model-provider gate and fixes the proxy host.
- **Context:** the Personal Health Record is on-device only (PHR-1). The AI Coach explains; deterministic rules create every Plan Change. Food capture is photo or text, recognized when online. A model provider's "no training" policy is not zero retention.
- **Decision:**
  - **Proxy:** one Cloudflare Worker serves both the AI Coach and food recognition. It is **content-stateless**: it never stores request or response bodies, health values, food text, photos or chat. One Durable Object holds only security and quota state: the enrolled public key, used nonces, the monthly billed-token count and a kill switch. No KV, queues, R2, caches or analytics payloads.
  - **Provider:** OpenAI or Anthropic, called directly from the Worker. One provider serves both uses. It is selected by the coaching bake-off on synthetic fixtures, run as the AI slice's first acceptance step, together with the meal benchmark from [Food recognition provider selection](https://github.com/SandunRathsara/motive/issues/16), under the FR-1 selection rule. The winner and its exact retention terms are recorded as an AI-1 amendment. Bundled food-recognition APIs (Passio, Edamam, fatsecret, LogMeal) are not used. Recognition uses the same provider's vision/text model, grounded in USDA FoodData Central. The FoodData Central lookup receives only a normalized food name.
  - **Retention posture:** accept the provider's standard no-training API retention; zero-retention agreements are not required. Use the provider's no-storage options (for example `store:false`) and no provider-side threads, files, vector stores or hosted retrieval. Keep health facts and evidence IDs out of schema definitions.
  - **Coaching Context**, assembled on the device for each request. Nothing outside it leaves the device for coaching:
    - 28 days of daily aggregates: weight with 7-day trend, sleep per night, HRV/resting HR against baseline, nutrition totals and adherence, plus coverage and known/unknown flags;
    - individual food line items and workout sets only from the last 7 days, or when they are the cited evidence;
    - the Plan Change being explained, with fixed before/after values and its Evidence Snapshot;
    - profile fields only where a rule uses them (Goal, targets, training days, age in years);
    - the current thread's last 6 turns.
  - **Never sent:** raw HealthKit samples, sample UUIDs, source or device names, birth date, names, photos (to the coach), location or stable record IDs. Evidence IDs are local to each request and mapped back on the device.
  - **Chat history:** on-device only, in the Personal Health Record. No provider-side conversation state.
  - **Photos:** sent only to recognition, with the draft's optional caption. Re-encoded with EXIF and location stripped and downscaled (size set by the recognition slice spec, within the 1.5 MB cap). Never sent to the AI Coach or the food database; never stored by the proxy. Coach questions about a meal use its confirmed line items.
  - **Consent:** two separate one-time consents, **Food recognition** and **AI Coach**, each shown before its first network use. Each names the provider, what is sent, its retention and what works without it. Both are revocable in Settings and asked again when the provider, retention terms or data categories change. There is no per-signal AI exclusion; signals are excluded through Apple Health permissions (HK-1). A "What the coach can see" view shows the last Coaching Context sent.
  - **Authentication:** the app holds an owner-enrolled, non-exportable Secure Enclave P-256 key. Its public key is pinned once in the Worker through `wrangler secret`, and re-enrolled after a reinstall or a new device. Every request signs method, path, body hash, timestamp and nonce. The Worker rejects a bad signature, a timestamp outside ±60 s or a reused nonce before reading the body. No App Attest in Phase 1. No shared or embedded secret.
  - **Secrets and caps:** the provider API key exists only as a Worker secret binding. The app ships no model key, provider SDK or shared secret. The Worker alone fixes the model allowlist, system prompt, output schema and caps: at most 32 KB of text or one image of 1.5 MB or less per request, 600 output tokens, a 30 s upstream timeout and at most one retry. A hard **$10/month** cap is enforced by the Durable Object's billed-token count; the provider's budget alert is only a backstop.
  - **Logging:** Worker observability, invocation logs, tails, Logpush and tracing are off. Bodies, headers, prompts and provider error text are never logged. Before any real data is sent, a synthetic log test (a distinctive fake body and header plus a forced upstream error, with every log surface inspected) must pass.
  - **Model output:** display-only, with no tools or executable payloads. Responses are Zod-validated against a fixed `answer` / `evidenceRefs` / `insufficientData` / `escalation` schema. Evidence refs must exist in that request's Coaching Context, and any quoted Plan Change number must match. Unvalidated prose is never streamed.
  - **Offline and failure:** Plan Changes and their deterministic explanations always work offline. Offline, the chat composer is disabled and questions are not queued. Food Drafts queue offline and are sent on reconnect in the foreground, only if recognition consent is granted, without changing their capture time. Every timeout, refusal, failed validation or reached cap falls back to the deterministic explanation or "insufficient data", with a plain reason.
  - **Declined or revoked consent:** without AI Coach consent, Coach shows only deterministic insights and explanations. Without recognition consent, Food Drafts are saved but never sent. They stay pending and never count toward intake, as in the technical-failure state of [Food capture contract](https://github.com/SandunRathsara/motive/issues/8), with a prompt to enable recognition instead of Retry. Phase 1 has no consent-free path to a Food Entry. Revoking consent stops future sends immediately and deletes nothing locally.
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
  - **Benchmark protocol:** this is the recognition slice's first acceptance step, run through the real Worker pipeline with both provider adapters, pinned model versions, prompts and schemas, on a separate dev Worker environment with a one-off $25 cap (outside the $10/month personal cap).
    0. The owner lists their frequent dishes, cuisines and brands. Each is checked for an FDC direct match or Recipe Estimate coverage before any meals are collected. A cuisine must work if it is about 10% or more of meals.
    1. Collect 40 real meals over about 2 weeks, in proportion to the owner's mix, including mixed dishes, large portions, oils/sauces and drinks. Each meal is entered as a photo with no caption and as a one-sentence description (80 inputs per provider).
    2. At least 30 meals are weighed per component. The reference nutrients come from those weights and owner-selected FDC records. Up to 10 unweighed restaurant/takeaway meals are scored on identity and correction burden only.
    3. The owner writes one correction sentence per meal before running. Both providers receive the same sentence.
    4. 10 meals are run 3 times per input per provider for repeatability.
    5. Report item precision/recall, match correctness, portion error, kcal and protein error and bias, unknown rate, correction burden, latency percentiles, tokens and per-capture cost.
    The benchmark measures recognition and matching against FDC, not FDC's own accuracy. Real meals are sent under the recognition consent and AI-1's accepted retention.
  - **Selection rule:** the recognition gates above and the coaching bake-off's gates are pass/fail. Among providers that pass both, the coaching bake-off score picks the winner; lower cost breaks a tie. If no provider passes recognition, the slice stops and returns to the roadmap; the bar is not relaxed silently.
- **Consequences:** recognition costs two model calls per capture. FDC availability becomes a runtime dependency of recognition, not of reviewing stored entries. The Food capture contract's "nutrients come only from a matched database record" reads as "matched database record(s)". The provider is recorded in the AI-1 amendment with its measured results.

## 7. Quality gates

At bootstrap, define scripts with these names or record the equivalent names here. Agents must inspect `package.json` and run the real scripts; absence of a script is not permission to claim a gate passed.

| Gate | Required scope |
|---|---|
| `typecheck` | Strict TypeScript across app, source, tests, and config included by the project. |
| `lint` | ESLint plus React/React Native, hooks, import-boundary, and inline-style rules. |
| `test` | Jest and React Native Testing Library for changed logic and important component behavior. |
| `architecture` | Repeatable checks for forbidden imports, store placement, provider SDK leakage, and inline styles. |
| `test:e2e` | Maestro critical flows once screens and the Maestro harness exist; native HealthKit paths also require real-device verification. |

A feature is done only when applicable gates pass and unrun gates are explicitly reported. Architecture checks belong in `scripts/` with source comments pointing to `docs/ARCHITECTURE.md`; do not encode a second, conflicting architecture in a lint rule.

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
