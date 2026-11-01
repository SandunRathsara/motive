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
| Backend | Provider-neutral feature services | No provider is selected. UI and domain logic depend on service contracts, not a backend SDK. |
| Persistence | Explicit decision gate | No database or offline-sync architecture until the persistence gate in §5 is resolved. |
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

Until a backend provider is selected, implement only the service contract and an appropriate local/mock adapter required by the feature. Do not scatter placeholder provider calls through the app.

When the backend gate is opened, the decision must name:

- provider, authentication flow, authorization/ownership rules, and environments;
- service interface and provider-adapter location;
- network DTOs, Zod validation, error mapping, and Query integration;
- data classified as profile, food, workout, health sample, chat, or credentials;
- explicit consent and transport rules for health data;
- deletion/export behavior, retention, logging, and analytics restrictions.

**Secrets:** API keys, service-role credentials, model-provider secrets, and privileged tokens stay server-side. Public client configuration is not a secret store. Do not send health data to an AI provider without an explicit product/privacy decision and user consent.

## 5. Persistence decision gate

Persistence is not selected by default. Before adding SQLite, MMKV, AsyncStorage, SecureStore, files, or offline synchronization, record:

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

- backend provider and authentication;
- persistence and offline behavior;
- HealthKit library versus custom native module, and any watchOS app;
- AI/model provider and health-data transmission;
- any inline-style exception;
- any change to package manager or native build workflow.

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
