# Motive Agent Guide

## Required reading

- **Architecture:** Read `docs/ARCHITECTURE.md` before creating or changing routes, components, feature logic, stores, services, or tests.
- **Stack:** Read `docs/TECH_STACK.md` before bootstrapping the app, changing dependencies, configuring Expo/native capabilities, selecting backend or storage, or running builds.
- **Product:** Read `docs/REQUIREMENT.md` before implementing or changing product behavior, health-data handling, AI coaching, or integrations.

The documents above are authoritative for their branch. Do not reconstruct their rules from memory.

## Core invariants

- Use React Native with Expo SDK, Expo Router, and strict TypeScript.
- Use NativeWind classes for styling. Inline styles require an explicit user-approved exception and a documentation update.
- Put every UI component under `/components` using atomic design. Expo Router files under `/app` are thin route compositions, not reusable component homes.
- Put non-UI feature logic under `/features/<domain>` and genuinely global client-state stores in separate files under `/store`.
- Use TanStack Query for remote/server state, Zustand for shared client state, TanStack Form for complex forms, and Zod at external-data boundaries.
- Keep backend providers behind feature service interfaces. Provider SDKs, native APIs, secrets, and HealthKit calls do not belong in UI code.
- Verify `/app/_layout.tsx` and existing providers before altering any global layout or provider.
- Inspect `package.json`, installed versions, lockfiles, and available scripts before changing dependencies or running project commands. Do not invent scripts or fix imports by guessing.

## Execution rules

1. Read the branch documents above, then trace the existing code path before editing.
2. Follow the source boundaries and state-ownership rules in `docs/ARCHITECTURE.md`; do not create parallel folder conventions.
3. Respect open decision gates in `docs/TECH_STACK.md`. A gate requires an explicit decision and documentation update before the corresponding implementation.
4. Make the smallest complete change. Add dependencies only when the platform or an existing package cannot do the job cleanly.
5. Run every applicable quality gate that exists in `package.json`: typecheck, lint, unit/component tests, architecture checks, and critical Maestro flows. Report checks that could not run.
6. Update the authoritative document when changing a stack decision, folder convention, dependency rule, quality gate, or decision gate. Keep `AGENTS.md` limited to triggers and always-loaded invariants.

## Native errors

On native compilation or build errors, invoke the Expo MCP logging tool first when it is available. If it is unavailable, state that and inspect local Expo/EAS build output. Never claim to have retrieved MCP logs without a successful tool call.

## Environment truth

`package.json`, lockfiles, Expo config, and the directory tree describe the current implementation; these documents describe the required conventions and decisions. If they disagree, stop and reconcile the discrepancy explicitly rather than silently replacing one with the other.
