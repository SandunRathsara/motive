# Motive Source Architecture

Use this document for every source-code change. Stack selection, native builds, dependency decisions, and open backend/storage gates live in `docs/TECH_STACK.md`; product behavior lives in `docs/REQUIREMENT.md`.

## 1. Architectural rule

**Thin routes, atomic UI, feature-owned logic, provider-neutral services, explicit state ownership.**

A feature crosses the repository vertically through a route, reusable UI, a feature hook/service, and possibly a global client store. Each layer has one job. Convenience does not justify skipping a layer or placing logic in a route/component.

## 2. Directory contract

Add folders when they first contain real code; do not scaffold empty speculative modules. Domain folders below illustrate the convention, not installed features.

```text
/app                         Expo Router routes and layouts only
  _layout.tsx                Verified global providers and root navigation
/components                  Every reusable or screen-level UI component
  /atoms                     Small, generic primitives
  /molecules                 Small compositions of atoms
  /organisms                 Feature-aware sections composed of lower levels
  /templates                 Screen layouts; compose organisms without fetching
/features                    Non-UI domain logic, grouped by domain
  /nutrition
    /hooks                   TanStack Query and feature view-model hooks
    /services                Contracts, DTO mapping, provider adapters
    nutrition.schemas.ts     Zod boundary schemas
    nutrition.types.ts       Domain types inferred or shared by the feature
    nutrition.utils.ts       Pure calculations
  /workouts
  /health
  /coach
/store                       Truly global client state; one focused store per file
/lib                         Cross-feature infrastructure and contracts
  /theme                     Presentation tokens consumed by NativeWind
  /persistence               Single owner of the record connection for every domain
  /query                     Query client and shared query defaults
  /native                    Cross-feature native infrastructure only
  /contracts                 Shared DTO/domain contracts when genuinely shared
  /utils                     Generic, domain-free utilities
  logger.ts                  One allowlisted logger (DATA-7)
  build.ts                   Build identity and variant configuration
/modules                     Local Expo native modules; platform shims only
/assets                      Images, fonts, and static resources
/scripts                     Repeatable architecture and maintenance checks
  /architecture              Checker implementation and violation fixtures
/.maestro                    iOS simulator flows
```

Colocate tests as `*.test.ts(x)` beside the code they cover.

### Folder rules

- `/app` contains route parameters, navigation composition, and screen-level data wiring only. It contains no reusable UI, API calls, native calls, or business calculations.
- `/components` contains all JSX component definitions except the thin route composition required by Expo Router. Feature-specific components still belong here, normally under an organism/template subfolder named for the domain.
- `/features/<domain>` contains no JSX. Hooks return view models and actions; services own I/O; schemas validate boundaries; utilities stay pure.
- `/store` is not a default destination for feature state. Create a store only when multiple routes/features need the same client state.
- `/lib` is not a miscellaneous folder. Move code there only when at least two domains need it and it has no feature ownership.
- `/modules` contains local Expo native shims required by documented platform decisions, not UI or domain logic. TypeScript adapters under `/lib/native` or the owning feature service validate their boundary.

## 3. Atomic UI rules

| Level | Responsibility | May do | Must not do |
|---|---|---|---|
| Atom | Button, input, badge, progress indicator | Accept typed props and callbacks; use NativeWind | Fetch, access stores/services, contain domain rules |
| Molecule | Macro row, stepper, source badge | Compose atoms; handle small presentation state | Fetch or own screen workflow |
| Organism | Nutrition diary, active workout panel, coach thread | Compose lower levels; use feature-specific prop types | Call provider SDKs or define global state |
| Template | Today, Train, Fuel, Coach layout | Arrange organisms and loading/empty/error regions | Own remote data or business calculations |
| Route | URL/navigation and dependency composition | Call feature hooks and pass view models/actions to a template | Define reusable JSX or bypass services |

Atoms and generic molecules accept primitive or generic presentation props. Feature-aware organisms and templates may use type-only imports from their domain. Keep components presentational even when a hook is passed indirectly through a route; this makes the same UI testable without native or network services.

### Component conventions

- Use PascalCase filenames and component names; one primary component per file.
- Use NativeWind classes with semantic design tokens. Keep repeated class composition in the component, not in a new styling framework.
- Inline styles require an explicitly approved, documented exception. Navigator chrome uses `lib/theme/navigation.ts`, derived from tokens and applied through the root `ThemeProvider`, not JSX style props or style-suffixed navigator options.
- Use accessible roles, labels, focus behavior, and minimum touch targets as part of the component contract.
- Render loading, empty, error, and unavailable-data states deliberately. Missing health data is unknown, not zero.
- Do not create an atom for every trivial wrapper. Extract a component when reuse, complexity, or testing justifies it.

### Visual tokens

- Dark only, ported from the frozen prototype. `lib/theme/tokens.js` owns values and the text/background allowlist; `tailwind.config.js` consumes it.
- `bg` is the screen background; `surface`, `surface-2`, `surface-3` are layered surfaces; `line` and `line-soft` are borders/dividers; `text`, `muted`, `subtle` are text hierarchy.
- `accent` marks primary actions, with `accent-ink` on accent fills. `info` is prototype blue; `caution` is amber. `danger` is only for destructive actions and errors, never intake versus target (no red shame states).
- Radii `lg`/`md`/`sm` are 24/17/12 pt. Text uses the iOS system font; Avenir Next Condensed is for display numerals only. Inter is not bundled.
- Use only declared text/background pairs. Sub-AA pairs, including `subtle` on `surface-2` or `surface-3`, are banned. The colocated token test checks every declared pair against WCAG AA.

## 4. Import boundaries

| Importer | Allowed dependencies | Forbidden dependencies |
|---|---|---|
| `/app` | Components, feature hooks/contracts through each feature's public `index.ts` only, global stores, `/lib` | Private feature files, provider SDKs, native HealthKit calls, business utilities hidden in routes |
| `/components` | Other components, presentation hooks, type-only domain contracts from public feature `index.ts` or `<domain>.types.ts` / `<domain>.schemas.ts`, `/lib/theme` presentation tokens | Private feature hooks/services, all `@tanstack/react-query` imports, provider SDKs, global stores, native APIs |
| `/features` | Its own modules, `/lib`, global stores in `/store`, explicit public contracts of another feature | `/app`, JSX components, another feature's private files |
| `/store` | Domain types and pure `/lib/utils/**` utilities or `/lib/contracts/**` contracts (§2) | Other store files, components, Query cache, provider SDKs, native APIs |
| `/lib` | Installed infrastructure packages and platform APIs needed by its contract | `/app`, `/components`, `/features`, `/store` |

Additional rules:

- Cross-feature imports must use an explicitly exported public contract. If sharing becomes bidirectional, extract the shared contract to `/lib/contracts` rather than create a cycle.
- UI calls feature hooks or service contracts, never concrete backend/native adapters.
- Services return domain objects or typed errors, not provider responses.
- Zod validation happens at network, native, storage, and other untrusted boundaries before data enters domain logic.
- Do not add barrel files everywhere. Use a barrel only as a deliberate public feature boundary.
- The native share sheet (`expo-sharing`) is reached only through `features/data/services/share.ts`; other features use its public `nativeShare` adapter.
- Record-wide registries invert ownership: each feature exports its `ExportSection`s and `EraseParticipant`s (`/lib/contracts`) through its public `index.ts`, and `features/data/registry/` lists them. A new table is claimed by an export section (or excluded with a reason) or the table-completeness test fails.

## 5. State ownership

| State kind | Owner | Example |
|---|---|---|
| Single-control or ephemeral UI state | Local component state | Sheet visibility, focused tab, draft stepper value |
| Complex/multi-step form state | TanStack Form | Onboarding, editable nutrition entry |
| Remote/server data and request status | TanStack Query | Diary history, remotely stored plan |
| Shared client state across routes/features | Focused Zustand file in `/store` | Active workout session, client preferences |
| Shareable navigation state | Expo Router params | Selected date or workout ID |
| Native/platform data | Feature service, then Query or an appropriate client subscription | HealthKit samples and authorization availability |
| Untrusted external input | Zod schema at entry | API DTO, HealthKit bridge payload, stored record |

Query rules:

- Define stable, domain-scoped query keys in the owning feature; do not invent key shapes at call sites.
- Fetch and mutate through feature services. Invalidate or update affected keys in feature hooks.
- Do not copy Query data into Zustand or component state for convenience.
- Global Query provider/configuration is verified against `/app/_layout.tsx` before modification.

Zustand rules:

- One focused store per file; no monolithic `useAppStore` for unrelated domains.
- Export typed actions and state. Components receive shared state through routes or dedicated feature hooks rather than importing stores arbitrarily. Feature hooks and services may read a store or call its actions (for example, erase participants refuse writes unless `store/record-lifecycle.ts` allows them).
- Stores hold client state only, not fetched server caches, provider clients, secrets, or native module singletons.

## 6. Feature data flow

The default path is:

```text
Expo Router route
  → feature hook (Query + view model)
  → feature service contract
  → provider or native adapter
  → Zod validation and DTO mapping
  → domain result returned through the same layers
  → atomic template and organisms
```

A mutation follows the same path and updates the relevant Query keys. A native health subscription may use a feature-owned client subscription when Query's request/response model does not fit; document that choice in the feature service.

Errors cross boundaries as typed domain errors. UI maps them to calm, actionable states without exposing provider responses, health payloads, credentials, or stack traces.

## 7. Forms and domain validation

- Use TanStack Form for complex forms and multi-step workflows. Keep form schemas and submission mapping in the owning feature, not in a reusable input atom.
- Use Zod for external data even when TypeScript types already exist; TypeScript does not validate runtime input.
- Infer domain/form types from schemas where that removes duplicate declarations. Do not make every domain type a side effect of a UI form schema.
- Use canonical units in domain logic and convert only at input/output boundaries. Keep timestamps and source provenance with health and workout records.

## 8. Testing architecture

| Test level | Required target |
|---|---|
| Pure unit | Nutrition calculations, training progression, source precedence, DTO mapping, schemas, and store actions |
| Component | Important atoms/molecules and organism states with React Native Testing Library |
| Feature integration | Hook + Query + mocked service behavior, including errors and invalidation |
| Architecture | Forbidden imports, inline styles, misplaced stores, and provider/native leakage |
| Maestro | Critical daily loop and other high-value user flows after the harness exists |
| Real iOS device | HealthKit permissions, native sync, entitlement behavior, background/native edge cases |

Mock provider and native adapters at the service boundary. Do not use mocks as evidence that HealthKit works on a device. Tests follow the same import and state-ownership rules as production code.

## 9. Change completion checklist

A source change is complete when every applicable statement is true:

- Routes remain thin; every reusable/screen UI component is under `/components` at the appropriate atomic level.
- Non-UI logic is in its owning feature; no provider/native call or business calculation was added to UI.
- State uses the owner in §5, and Query data was not duplicated into Zustand.
- External data has Zod validation and provider DTOs do not leak into domain/UI types.
- NativeWind classes are used; global layouts/providers were verified before any change to them.
- Tests cover the changed behavior, including unavailable/empty/error states where relevant.
- Existing typecheck, lint, unit/component, architecture, and applicable Maestro/device gates ran or were explicitly reported as unrun.
- `docs/TECH_STACK.md` was updated for dependency/platform/decision changes, and this document was updated for folder/boundary/state-rule changes.
