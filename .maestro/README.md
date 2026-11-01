# iOS smoke verification

## Current result (1 November 2026)

**Blocked, not passed.** Full Xcode is absent (no Xcode in `/Applications` or Spotlight), active developer directory is `/Library/Developer/CommandLineTools`, and `simctl` is unavailable. No simulator/runtime could be enumerated. Release build, launch, simulator logs and container inspection remain unverified. No Expo MCP logging tool was available; local Expo/CocoaPods output was inspected instead.

- Installed Maestro **2.12.0** with `brew install mobile-dev-inc/tap/maestro`; verified `maestro --version`.
- Java was already Azul Zulu **17.0.21**. Maestro's Homebrew formula additionally installed OpenJDK **27.0.1.0.3** and upgraded brotli 1.2.1, glib 2.90.1, libx11 1.8.14, libxrender 0.9.13, harfbuzz 15.0.0_1, jpeg-turbo 3.2.1.
- Expo automatically installed CocoaPods **1.17.0** via RubyGems. Its executables are in `/opt/homebrew/lib/ruby/gems/4.0.0/bin`, initially missing from PATH. Setting PATH as below fixed `spawn pod ENOENT`.
- `git check-ignore ios/` confirmed generated native files are ignored.
- `APP_VARIANT=owner npx expo prebuild --platform ios --clean` generated the native project successfully, then failed to find `pod`. Expo also automatically changed the `ios`/`android` npm scripts; only those automatic changes were undone. No tracked source/config/docs changes remain from this agent.
- With gem bin on PATH, `pod install` in `ios/` succeeded: 121 pods, including **MotiveRecordDirectory 1.0.0**. `npx expo-modules-autolinking resolve --platform ios` discovers `MotiveRecordDirectoryModule`. This is discovery/integration evidence only, **not** evidence of successful compilation or runtime linking.
- `CI=1 APP_VARIANT=owner npx expo run:ios --configuration Release --no-bundler` completed pod installation but stopped: **Xcode must be fully installed**. No Swift compilation occurred.
- `MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true npm run test:e2e` failed: **0 devices connected**. Smoke assertions are not execution-validated.

## Rerun after installing full Xcode and an iOS simulator runtime

Select full Xcode and complete its first-launch setup. Install an iPhone simulator runtime in Xcode. These require owner setup; no Xcode installation was attempted here.

Run from the repository root:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export PATH="$(ruby -e 'print Gem.bindir'):$PATH"
export MAESTRO_CLI_NO_ANALYTICS=1
export MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true
xcodebuild -version
xcrun simctl list devices available
pod --version
java -version
maestro --version
git check-ignore ios/
APP_VARIANT=owner npx expo prebuild --platform ios --clean
```

**Check `git diff -- package.json` immediately after prebuild**: Expo rewrites npm `ios` and `android` scripts. Preserve any concurrent owner changes; do not blindly restore the whole file.

Choose the UDID of an available iPhone (prefer 390pt width), then:

```sh
export SIMULATOR_UDID='<available iPhone simulator UDID>'
xcrun simctl boot "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
APP_VARIANT=owner npx expo run:ios --configuration Release --no-bundler --device "$SIMULATOR_UDID"
npm run test:e2e
xcrun simctl spawn "$SIMULATOR_UDID" log show --last 2m --predicate 'process == "Motive"'
```

Skip `simctl boot` if already booted. Keep only the target simulator booted for the unqualified npm Maestro command. Release embeds JS and needs no Metro. The build/flow sequence above is the intended rerun, **not a successful build on this machine**. Simulator log should contain no missing-native-module error; verify actual rendered shell, not merely a live process.

`smoke.yaml` clears app state, taps Today → Train → Fuel → Coach → Today by accessibility label, checks actual placeholder text, and rejects `MOTIVE · RECOVERY` from `RecoveryTemplate.tsx`. Today initially has a header and tab with the same label, so the flow targets the second match. Validate this selector against the real accessibility tree on first execution.

## Container evidence (still required)

After a successful flow, terminate the app before copying so SQLite sidecars are stable. Inspect only a copy of the database:

```sh
xcrun simctl terminate "$SIMULATOR_UDID" dev.motive.app
CONTAINER="$(xcrun simctl get_app_container "$SIMULATOR_UDID" dev.motive.app data)"
RECORD="$CONTAINER/Library/Application Support/Motive"
ls -la "$RECORD"
xattr -l "$RECORD"
COPY="$(mktemp -d /private/var/folders/gb/j8pkyq8j0rd50dzkps44xgh40000gn/T/opencode/motive-db.XXXXXX)"
cp -p "$RECORD"/record.sqlite* "$COPY/"
/usr/bin/sqlite3 "$COPY/record.sqlite" 'PRAGMA user_version; PRAGMA secure_delete;'
```

Look for `com.apple.metadata:com_apple_backup_excludeItem` (its absence is not definitive proof of the NSURL backup-exclusion resource value). **`secure_delete` is connection-local, not persisted in the database file**: a system sqlite3 connection on a copy reports its own SQLite default, not proof of the running app's setting. Runtime/integration evidence is still needed. Never inspect or modify the original database with sqlite3.

No database, schema version, secure-delete runtime value, backup-exclusion attribute, Data Protection behavior, launch logs, or real-device evidence was obtained. Other JS/typecheck/lint/unit/architecture gates are owned by the orchestrating agents and were not run here.
