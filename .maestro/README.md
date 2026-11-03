# iOS simulator smoke verification

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

After prebuild, inspect `git diff -- package.json`: Expo rewrites the `ios`/`android` scripts. Undo only those automatic edits, preserving any other changes. `ios/` is ignored/generated.

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
  ONLY_ACTIVE_ARCH=YES ARCHS=arm64 CODE_SIGNING_ALLOWED=NO
APP_PATH="$HOME/Library/Developer/Xcode/DerivedData/Motive-fmfvetjoznxohkbrywrjmieohyrr/Build/Products/Release-iphonesimulator/Motive.app"
xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
xcrun simctl ui "$SIMULATOR_UDID" content_size large
npm run test:e2e
npm run verify
```

The DerivedData suffix is machine-specific; find the equivalent Release `Motive.app` if different. Release embeds the bundle through Xcode's bundle phase. If Maestro reports a missing `testmanagerd` unix socket after a host sleep, shutdown/boot the simulator and wait for `bootstatus -b`; increasing driver timeout alone did not repair the stale socket.

`smoke.yaml` launches with `clearState`, taps Today → Train → Fuel → Coach → Today by accessible label, verifies each placeholder, checks selected tab state, and rejects Recovery. The initial Today selector uses selected state because the native hierarchy contains duplicate header nodes; an index selector can tap the header instead of the tab.

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
