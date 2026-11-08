# MotiveHealthKit

iOS-only local Expo module for TECH_STACK HK-1/HK-2. Mirrors the repository's `motive-record-directory` module; no additional package or generated TypeScript barrel is needed.

## Bridge

- `isAvailable(): Promise<boolean>` checks `HKHealthStore.isHealthDataAvailable()`.
- `requestReadAuthorization(): Promise<void>` requests exactly body mass, sleep analysis, HRV SDNN, resting heart rate and workouts, with an empty share set. Completion does **not** mean read permission was granted.
- `requestStatus(type): Promise<'shouldRequest' | 'unnecessary' | 'unknown'>` checks whether another request is needed for just that type. It cannot reveal read denial.
- `anchoredFetch(type, anchorBase64OrNull, startMsOrNull, limit): Promise<{ samples, deletedUuids, anchor, hasMore }>` runs a one-shot `HKAnchoredObjectQuery`. Types are `bodyMass`, `sleep`, `hrv`, `restingHeartRate`, `workout`; other strings reject. `limit` must be positive. The health sync service owns authorization-before-query, the retained 90-day start bound, pagination and atomic persistence.

`startMs` applies a strict sample-start lower bound. Anchors are secure-coded `HKQueryAnchor` archives, base64 encoded; a malformed archive rejects instead of silently restarting. `hasMore` means the **raw** samples-plus-deletions count filled the limit. An exactly-full last page therefore needs one extra empty fetch. Unknown future sleep stages are skipped, but still count toward the raw page limit. No update handler, observer or background delivery is installed.

Samples follow `features/health/health.schemas.ts`: kg, ms, bpm; all six known sleep stages; workout interval/activity raw value only; source/revision and real `HKDevice` fields with nulls for absence. Workout energy, distance, statistics and routes are never read. Only the user-entered metadata key is inspected. Native errors expose fixed codes/messages, not underlying HealthKit errors or sample data.

Only `features/health/services/` may load this module. Its wrapper resolves the module when constructing the adapter, not on import: missing native code (web, Jest, Expo Go or an old binary) makes `isAvailable()` false and other operations reject. Errors from an available module still reject. The wrapper validates the envelope and status, leaving each sample unknown so sync can skip/count bad samples.

## Configuration and provisioning

`app.plugin.js` is shared by both app variants and adds only:

- entitlement `com.apple.developer.healthkit = true`;
- `NSHealthShareUsageDescription = "Motive reads weight, sleep, HRV, resting heart rate and workouts to show your signals. It never writes to Health."`

It does not add a write usage string, background delivery, required-device capability or clinical-record permission. `com.apple.developer.healthkit.access` is omitted: [Apple documents it](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.healthkit.access) as access to additional sensitive types (currently `health-records`), not any HK-1 type.

[Apple's current iOS capability table](https://developer.apple.com/help/account/reference/supported-capabilities-ios/) marks HealthKit **yes** for ADP, ADEP **and the no-cost Apple Developer membership** (checked 8 November 2026, including the HTML checkmark cells). This supports BUILD-1 Personal Team local signing in principle; actual personal provisioning and the issue #21 HealthKit checklist still require the owner's iPhone. Do not use an employer team. An unsigned simulator compile is not device-signing or HealthKit permission evidence.

## Simulator verification — 8 November 2026

- Installed Expo 58.0.22 / React Native 0.88.1, default New Architecture; owner clean prebuild and CocoaPods install succeeded. `package.json` and `package-lock.json` remained unchanged.
- Generated owner `ios/Motive/Info.plist` and `ios/Motive/Motive.entitlements` contained exactly the two Health-related keys above. The embedded Release app's Info.plist retained the same read description. Verification (`dev.motive.app.verification`) `expo config --type introspect` produced the same keys. No write string, `.access`, clinical-record string or background-delivery entitlement was present.
- Release arm64 simulator `xcodebuild` succeeded, including `MotiveHealthKitModule.swift` with no diagnostics from that source and a successfully embedded JS bundle. Used `.maestro/README.md`'s environment, `-derivedDataPath /tmp/motive-sim-dd ONLY_ACTIVE_ARCH=YES ARCHS=arm64 CODE_SIGNING_ALLOWED=NO` on iPhone 17e / iOS 27.2 (`3F737D26-4544-4954-9165-EB1DFEA8A8AA`). Generated app link flags include `-framework "HealthKit"`.
- Installed `/tmp/motive-sim-dd/Build/Products/Release-iphonesimulator/Motive.app`; `simctl launch booted dev.motive.app` succeeded. `/tmp/motive-hk.png` shows Today, not Recovery. This was an untagged verification build, not a phone install.
- `maestro test .maestro/smoke.yaml` passed on that binary (Today → Train → Fuel → Coach → Today, no Recovery).
- Native build log: `/private/var/folders/gb/j8pkyq8j0rd50dzkps44xgh40000gn/T/opencode/motive-healthkit-xcodebuild.log`. No Expo MCP logging tool was available; local Xcode output was inspected.
- Real-device authorization, Personal Team provisioning, five-type reads/deletions, provenance and anchor round-trips remain unverified. See issue #21's Device Checklist.
