# Agent Execution Rules & Stack Architecture

## Tech Stack
- Framework: React Native (Expo SDK)
- Language: TypeScript (Strict mode)
- Styling: NativeWind
- State: Zustand (Separate store files only)

## Repository Structure & Constraints
- All UI components go into `/components` using atomic design.
- All global state hooks go into `/store`.
- NEVER use inline styles; always use NativeWind classes.
- NEVER alter global layouts without verifying against `/app/_layout.tsx`.

## Error Handling Protocol
- On native compilation or build errors, immediately invoke the Expo MCP tool to pull logs.
- Do not guess fixes for broken imports; inspect package.json explicitly before installing updates.

