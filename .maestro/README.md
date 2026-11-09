# iOS simulator smoke verification

## Slice 5 training logging — 9 November 2026

Release-configuration arm64 simulator build of the slice 5 tree (owner `1.0.0+13`, untagged; `dev.motive.app`) passed on iPhone 17e / iOS 27.2, content size `large`. The worktree had no `ios/`, so a clean owner prebuild (`APP_VARIANT` and `EXPO_PUBLIC_APP_VARIANT` both `owner`) restored it; the README's arm64-only `xcodebuild` command and `/tmp/motive-sim-dd` then succeeded. `package.json`, the lockfile and `app.config.ts` stayed unchanged. No Expo MCP logging tool was available; there were no native build errors to inspect.

- **Final `npm run verify`: all five gates passed** — typecheck, lint, Jest (**125 suites / 1,122 tests**), architecture and Maestro (**9/9**, **7m 42s**). Per-flow: `settings-kcal` 50s, `train-offline` 53s, `train-resume-chip` 54s, `onboarding-plan` 31s, `settings-export` 35s, `settings-delete` 57s, `health-signals` 1m 24s, `train-session` 1m 1s, `smoke` 36s. The slice 4 flows and `smoke` (updated by H for the real Train screen) needed no further change.
- **App bug found by the flows, fixed with a test (TDD):** after the first set was logged, the rest bar appeared, the docked exercise panel shrank, and the next chip sat below its visible area. A tap where the chip should be landed on the rest bar, so one-tap logging of consecutive sets failed. `ActiveSession` now follows the next chip: `ExerciseCard.onFocusLayout` reports the focus block's y (body + block offsets) and the docked `ScrollView` scrolls to it, with a component test in `ActiveSession.test.tsx`. Unit tests could not see this because Jest has no layout. Also added `lib/query/client.test.ts` (queries and mutations run offline; it fails without `networkMode: 'always'`), the JS-level half of the airplane-mode approximation.
- `train-session` (b): start from Today's quick-add **Set** → first-session chip says "Load not set" → eight load-stepper taps (20 kg) → log → **Undo** within the 5 s window (toast gone, "0 of 14 sets") → log three squat sets → **Finish session** → summary (`session-summary`, Volume, "3 working sets", counts toward target, Done) → Done returns to Today with **Start Full Body**.
- `train-resume-chip` (a, UX-1): setup finishes session 1 so Back Squat has a Recommended Set, starts session 2, logs one set and relaunches, so Today offers **Resume Full Body**. The asserted segment uses **2 taps** (Resume, then the chip; the limit is 3): the chip's label must contain "recommended", the set count goes to "2 of 14 sets", and the keyboard (`inputView`, `dictation`) is absent before, during and after. A fresh install's first-ever chip needs a load, so UX-1 applies from the second session; the unit test in `app.training.test.tsx` covers the same path against a faked service.
- `train-offline` (c, airplane mode): **approximated, not tested in airplane mode.** The simulator cannot toggle airplane mode (no `simctl` or Maestro control; disabling the host network would affect the whole machine). The flow runs the loop through a different entry (Train tab → Start) with undo, finish, Done and a relaunch that re-reads the finished session ("3 sets · 360 kg", "1 of 4 sessions") from local SQLite. The evidence that it needs no network: (1) `grep` finds no `fetch`/`XMLHttpRequest`/`WebSocket`/URL in `app`, `features`, `components`, `lib` or `store`; (2) Query's global client uses `networkMode: 'always'`, covered by the new test; (3) `nettop -P -p Motive -L 1` sampled in a loop during a full run of the flow reported **no sockets for the Motive process** (14 samples over 68 s). The probe was validated with a positive control, since `curl` traffic shows up in the same command. Limits: samples every ~5 s can miss a short exchange, and traffic made by system daemons on the app's behalf would not appear under its name. Not repeatable from `npm run verify`; the probe is ad hoc.
- Harness details: the id selector (`id:`) reaches the testIDs (`today-training-action`, `quick-add-set`, `next-set-chip`, `set-chip-<chipKey>`, `undo-button`, `finish-session`, `session-summary`, `active-session`, `tab-train`) and can be combined with `text:`, which matches the accessibility label (for example "20 kilograms, 6 reps", "Resume Full Body"). `next-set-chip` moves to the next unlogged chip after each log. Tap it after asserting the new set count, since a chip in `saving` is disabled. The toast lasts 5 s, so tap `undo-button` straight after the log, with no assertion between. An open keyboard shows up in the hierarchy as `inputView`/`dictation`, which is how "no keyboard" is asserted. Recent-session rows carry a date ("Full Body, Mon 9 Nov, …"), so the flows match them with a regex. Shared steps live in `subflows/log-three-squat-sets.yaml` and `subflows/finish-session.yaml`.
- Maestro: the slice 4 copy under `$TMPDIR/opencode/slice4-maestro/maestro/` had lost its `lib/` directory. The retained zip matched the published SHA-256 for 2.12.0 (`a6044a84…ec5e`, from the release's `checksums_sha256.txt`) and was extracted into `$TMPDIR/opencode/slice5-maestro/x/`; passing commands prepended `…/slice5-maestro/x/maestro/bin` to PATH. Nothing global was installed. Logs: `$TMPDIR/opencode/slice5-i-prebuild.log`, `slice5-i-build.log`, `slice5-i-build2.log` (rebuild after the fix), `slice5-verify.log` and `slice5-nettop.log`.
- Device-only / not covered by these flows: real airplane mode on a tagged device, rest-timer behaviour while backgrounded or locked, VoiceOver (set chip labels, undo-toast announcements, rest-bar semantics), Reduce Motion, Dynamic Type AX3 on the session, set sheet and summary screens, direct entry and its numeric keyboard (long-press on a stepper), the set sheet's edit/delete paths, Program editor flows, Health workout linking and Other Activity, edit-after-save, Plan Version appends from program saves, UX-7/UX-1 timing on the real iPhone, and kill-mid-commit (DATA-2). Content size was left at `large`; no device installation, release, tag or build-number change was part of this run.

## Slice 4 onboarding and Plan v1 — 8 November 2026

Release-configuration arm64 simulator build of owner **1.0.0+12** (`dev.motive.app`, untagged) passed on iPhone 17e / iOS 27.2, content size `large`. The incomplete generated project had no workspace; a clean owner prebuild restored it and installed Pods. Both `APP_VARIANT` and `EXPO_PUBLIC_APP_VARIANT` were explicitly `owner` for prebuild, Xcode and verification. The README's arm64-only Xcode command and `/tmp/motive-sim-dd` succeeded; tracked package/config diffs remained empty. No app implementation fix was needed.

- **Final `npm run verify`: all five gates passed** — typecheck, lint, Jest (**78 suites / 686 tests**), architecture and Maestro (**6/6**, **4m 22s**). Per-flow: `settings-kcal` 49s, `onboarding-plan` 31s, `settings-export` 32s, `settings-delete` 51s, `health-signals` 1m 5s, `smoke` 35s. Jest emitted the existing Watchman recrawl warning but passed.
- **Review-fix rerun:** the existing workspace rebuilt successfully on the first attempt with the same Release arm64 command, owner identity and simulator. Full `npm run verify` passed all five gates: typecheck, lint, Jest (**79 suites / 693 tests**), architecture and Maestro (**6/6**, **4m 20s**). Per-flow: `settings-kcal` 48s, `onboarding-plan` 30s, `settings-export` 32s, `settings-delete` 51s, `health-signals` 1m 5s, `smoke` 34s. No prebuild, dependency/configuration change, physical-device install, release or tag was needed. Logs: `$TMPDIR/opencode/slice4-review-build.log` and `slice4-review-verify.log`.
- Every top-level flow starts with `clearState: true`, then runs `subflows/onboard.yaml`: typed age/height/weight, picked sex/activity, Fat Loss with its default rate, a weekly session target and Start. It never taps **Use Apple Health**. Nested subflows are not independently discovered by `maestro test .maestro`.
- `onboarding-plan`: starting plan preview → Today with **starting estimate** and **Plan v1**; relaunch retains the committed plan without onboarding.
- `settings-kcal`: Settings → kcal target; 1,200 kcal is refused with the **1,755 kcal** floor, **BMR at your reference weight** reason and **Nothing was saved**; a corrected 2,400 kcal save → Today with **Plan v2 · changed today**, the new target and no starting-estimate label. Reaching v2 also checks that the refusal appended no version.
- `settings-delete`: retains both confirmation steps and out-of-scope-data disclosures, now expects onboarding instead of the removed Today placeholder, then completes onboarding again at **Plan v1**. Recovery, incomplete deletion and stale Settings are rejected.
- `smoke`, `settings-export` and `health-signals` retain their navigation/export/signal checks after setup. Smoke now checks the real Today targets instead of obsolete placeholder copy; the other three tabs remain placeholders. Settings flows scroll to the original controls below the new Plan rows.
- iOS harness details: choose activity before opening the numeric keyboard (obscured radios can remain in the hierarchy, and `hideKeyboard` failed); target the second label match for labelled inputs. Today's kcal accessibility value includes **starting estimate**, so assertions match the combined value. Settings' native back button is currently labelled **(tabs)**, not Today.
- Maestro was absent from PATH and the old `/tmp/motive-sim-evidence` copy was gone. Downloaded the official **2.12.0** release ZIP, verified its published SHA-256, and extracted it only under `$TMPDIR/opencode/slice4-maestro/`; passing commands prepended `$TMPDIR/opencode/slice4-maestro/maestro/bin` to PATH. No global tooling or repo dependency changed. Logs: `$TMPDIR/opencode/slice4-prebuild.log`, `slice4-build.log`, `slice4-e2e-first.log`, `slice4-kcal-final.log` and `slice4-verify.log`; full-suite Maestro artifacts are under `~/.maestro/tests/`.
- Device-only / not covered by these flows: Health prefill and its permission sheet/provenance/slow-or-empty fallback, VoiceOver focus and announcements, the slice-4 AX3 checklist, airplane-mode tagged-device onboarding, and kill-mid-flow/before-versus-after-Start behavior. Relaunch after a completed setup is not kill-mid-flow evidence. No device installation, release or build tag is part of this simulator run.

## Slice 3 Health Signals — 8 November 2026

Release-configuration arm64 simulator build of owner `1.0.0+9` (uncommitted, untagged), including `modules/motive-healthkit`, passed on the same iPhone 17e (iOS 27.2), content size `large`. Clean owner prebuild and `xcodebuild -derivedDataPath /tmp/motive-sim-dd` succeeded; `git diff -- package.json` remained empty. Generated HealthKit configuration has the read-purpose string and entitlement, without a write-purpose string or background delivery.

- `npm run test:e2e`: `settings-export`, `settings-delete`, `health-signals` and `smoke` passed (4/4, 1m 38s). `npm run verify` passed all five gates: typecheck, lint, Jest (63 suites, 486 tests), architecture, and the same four Maestro flows (4/4, 1m 37s).
- `health-signals`: six navigation/confirmation actions, each destination asserted: Today avatar → Settings → Health Signals (S10; all five rows, calm not-connected/unknown copy, Connect visible but never tapped) → Weight detail (S11) → delete-history sheet with the Apple Health/re-import disclosure → confirmed empty history → S10. Zero-valued signals and “denied” copy are rejected; zero coverage counts are allowed. The workout row's source label is **Health workouts**. iOS does not expose the Modal's `delete-signal-history-sheet` testID, so the flow asserts the sheet title, disclosure and confirm control instead. No app source fix was needed.
- Screenshot inspection: `/tmp/motive-sim-evidence/s10-large.png` and `s11-large.png` show readable wrapping, no truncated app text, no unknown values rendered as zero, and no “denied” copy. S10 at `accessibility-extra-extra-extra-large` remains scrollable to recent workouts; Connect wraps to three lines and takes substantial vertical space but is reachable. The ad-hoc check uses partial row visibility because an enlarged row can exceed the viewport. `s10-accessibility-extra-extra-extra-large*.png` records the check; content size was reset to `large`. This is not the full accessibility checklist.
- Host tooling: Maestro disappeared from PATH during the first run (which also hit an `xcrun` spawn error). Passing runs used an isolated copy of the same Maestro 2.12.0 at `/tmp/motive-sim-evidence/maestro-2.12.0/maestro/bin`, prepended to PATH; this did not change repo dependencies or install a global tool. Build, first-run, final E2E and verify logs are under `/tmp/motive-sim-evidence/health-signals-*.log`.
- Review-fix rerun: the same Release arm64 command and DerivedData path passed, including a fresh `SwiftCompile` of `MotiveHealthKitModule.swift`; the existing generated project needed no prebuild. Reinstalled owner `1.0.0+9`, content size `large`. `npm run verify` passed all five gates: typecheck, lint, Jest (63 suites, **508 tests**), architecture and Maestro (4/4, 1m 36s; `health-signals` 48s). `git diff -- package.json` remained empty.
- Rerun harness corrections: the initial hook assertion raced Query's observer notification, so it now uses the existing `waitFor` helper; the initial Maestro Sleep assertion expected the old bare unknown copy, so the flow now asserts daily coverage on Sleep, HRV and resting HR. No app implementation was changed by this rerun. Fresh `/tmp/motive-sim-evidence/review-s10-*.png` and `review-s11-*.png` show daily coverage (`0 of 1 nights` for Sleep, `0 of 1 days` for HRV/resting HR), baseline coverage on S10, and rendered “Not connected to Apple Health” status copy on S10/S11, without truncated app text or zero-valued unknown signals. Dynamic Type was not repeated in this rerun; the earlier enlarged-text evidence remains above. Rerun logs are `health-signals-review-build.log`, `health-signals-review-verify-final.log` and `health-signals-review-capture.log` in the same evidence directory.
- Not covered: issue #21's real-device checklist/tagged iPhone build, Connect/the HealthKit permission sheet, real samples/backfill/deletions/source provenance, VoiceOver or Reduce Motion. The simulator delete flow confirms an already-empty cache; populated-cache purging is covered by the fake-adapter integration tests, not native sample evidence.

## Slice 2 data control — 8 November 2026

Release-configuration simulator build of the slice 2 tree (identity still `1.0.0+8`; not a release, untagged) on the same iPhone 17e (iOS 27.2), content size `large`, built with `-derivedDataPath /tmp/motive-sim-dd`. `maestro test .maestro`: `settings-export`, `settings-delete` and `smoke` passed (3/3, 47 s).

- `settings-export`: Today avatar → Settings → Export data → plaintext warning → share sheet showing `motive-export-2026-11-08` (JSON, 491 bytes) → dismissed → "Export finished." → Settings. The iOS 27.2 sheet has no Close button; the flow taps the uncovered top of its `PopoverDismissRegion`. `export-staging/` was empty afterwards; it held the file only while the sheet was open.
- `settings-delete`: two-step sheet (disclosures, then "Delete everything") → Today placeholder with the Today tab selected, no Recovery, no Settings.
- Ad-hoc (outside `.maestro/`, the delete flow without `clearState`): a seeded `gate_metric` row was gone after delete-all, the record reopened at `user_version=1`, and Application Support held only `Motive` (no `Motive.erase-intent` or `Motive.erasing`).
- Not covered here: verification-variant interruption (force-quit mid-export or after database deletion), Recovery's erase on a corrupt record, Dynamic Type 200%, VoiceOver and the real-device checklist.

## Re-run — 8 November 2026

After the tab-bar Dynamic Type fix (`fcccc01`): Release simulator build of owner `1.0.0+8` on the same iPhone 17e (iOS 27.2), content size `large`. `npm run verify` passed all five gates; `smoke` passed in 24 s. Built with `-derivedDataPath /tmp/motive-sim-dd`, so the app is at `/tmp/motive-sim-dd/Build/Products/Release-iphonesimulator/Motive.app`.

## Result — 3 November 2026

**Release simulator build and all five `npm run verify` gates passed.** Xcode 27.2 (27B52), iOS 27.2, iPhone 17e `3F737D26-4544-4954-9165-EB1DFEA8A8AA`, 390×844 pt (1170×2532 at 3×). Owner bundle `dev.motive.app`, build `1.0.0+1`, standalone embedded JS; Metro is not needed. This is **simulator evidence, not the issue #19 real-iPhone checklist**. No build tag was created or pushed.

Maestro 2.12.0 and CocoaPods 1.17.0 were already installed. The initial universal simulator build exhausted disk space. Rebuilding only arm64 succeeded after removing this run's generated Motive DerivedData. No dependency change was needed. No Expo MCP logging tool was available; local Expo/Xcode output was inspected.

Two runtime fixes were required: render `ShellTabBar` through a JSX callback rather than passing the component as the navigator's render function, and inspect a disposable database/WAL copy before opening the original (SQLite otherwise removes empty sidecars when closing a newer-schema record). The direct component callback caused `Invalid hook call` when React Compiler injected its memo-cache hook. React Compiler remains **enabled**; the rebuilt compiled Release shell passes smoke. See TECH_STACK's bootstrap simulator amendment for schema preservation.

## Exact working sequence

Run from the repository root; keep only this simulator booted for the unqualified npm Maestro command:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export PATH="/opt/homebrew/lib/ruby/gems/4.0.0/bin:$PATH"
export APP_VARIANT=owner
export EXPO_PUBLIC_APP_VARIANT=owner
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
export SIMULATOR_UDID=3F737D26-4544-4954-9165-EB1DFEA8A8AA
npx expo prebuild --platform ios --clean
```

After prebuild, `git diff -- package.json` should be empty: the `ios`/`android` scripts already use `expo run:*`, so prebuild no longer rewrites them. `ios/` is ignored/generated.

If the simulator is shut down, boot it first:

```sh
xcrun simctl boot "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
```

Then build/install/test (allow 30 minutes for the build):

```sh
xcodebuild -workspace ios/Motive.xcworkspace -scheme Motive \
  -configuration Release -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
  -derivedDataPath /tmp/motive-sim-dd \
  ONLY_ACTIVE_ARCH=YES ARCHS=arm64 CODE_SIGNING_ALLOWED=NO
APP_PATH="/tmp/motive-sim-dd/Build/Products/Release-iphonesimulator/Motive.app"
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
xcrun simctl ui "$SIMULATOR_UDID" content_size large
npm run test:e2e
npm run verify
```

Release embeds the bundle through Xcode's bundle phase. If Maestro reports a missing `testmanagerd` unix socket after a host sleep, shutdown/boot the simulator and wait for `bootstatus -b`; increasing driver timeout alone did not repair the stale socket.

`smoke.yaml` launches with `clearState`, completes typed onboarding, taps Today → Train → Fuel → Coach → Today by accessible label, verifies Today targets and the other tabs' placeholders, checks selected tab state, and rejects Recovery. The initial Today selector uses selected state because the native hierarchy contains duplicate header nodes; an index selector can tap the header instead of the tab.

## Simulator recovery evidence

Artifacts are local to `/tmp/motive-sim-evidence/`; destructive ad-hoc flows stay there, **outside `.maestro/`**. `scenarios.py` operates only on the simulator owner sandbox. Stop the app with `xcrun simctl terminate` before editing the database. Its container is obtained with `xcrun simctl get_app_container booted dev.motive.app data`; the record lives in `Library/Application Support/Motive/`.

- Fresh: `user_version=1`, `gate_metric` exists, no snapshot, backup-exclusion xattr present (`com.apple.metadata:com_apple_backup_excludeItem: com.apple.MobileBackup`).
- Newer schema: version 99 shows the newer-build Recovery copy; original database, WAL and SHM SHA-256 hashes all remain unchanged. JSON manifests and `newer.txt` record the hashes.
- Corrupt record: Retry stays in Recovery; plaintext warning precedes the native share sheet; erase stays disabled for empty/`ERAS`, enables for `ERASE`, and produces a fresh v1 record with no `Motive.erasing`.
- Snapshot: restoring after corruption recovers the `sim-snapshot` Gate Metric, with a data-loss warning. A forced migration-2 failure was **not** injected; that remains verification-variant/device work.
- Unclean exit: foreground termination adds exactly one `unclean_exit` with NULL duration and build `1.0.0+1`; clean background/termination adds none. The harness clears the sentinel between these independent scenarios to exclude its inspection termination.
- AX3: screenshot inspection shows wrapping labels and scrollable content, without truncated controls; Recovery controls are reachable by scrolling. Hierarchies expose tab labels/selected state and Recovery labels. Content size is reset to `large` afterwards. `simctl ui` does not expose Reduce Motion; no live Reduce Motion verification is claimed.
- Rough warm relaunch: Maestro `launchApp` plus Today assertion measured 6.089 s, including automation/settling overhead. This is not a UX-7 measurement or evidence of <1 s on the real iPhone.

`secure_delete` is connection-local: system sqlite3's value is not proof of the app connection's setting. Real-device runtime evidence, Data Protection, Finder-backup inspection, tagged EAS installs of both variants, downgrade/forced-migration failure, VoiceOver, Reduce Motion and real UX-7 timing remain required.
