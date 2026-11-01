# Motive Domain Language

Canonical vocabulary for Motive's personal health and fitness coaching product. Use these terms in roadmaps, issues, specifications, and implementation discussions.

## Language

**Phase 1 MVP**:
A personal-use release for one user to validate the complete daily coaching loop on a real iPhone. It excludes public distribution and multi-user operation.
_Avoid_: public MVP, beta launch, TestFlight release

**Complete Daily Loop**:
The connected product journey of recording nutrition and training, incorporating health signals, receiving one useful coaching recommendation, and reviewing the resulting trend or outcome.
_Avoid_: feature checklist, dashboard loop

**Plan Change**:
A single proposed adjustment to a nutrition target, training prescription, or schedule that the user can inspect, accept, reject, and reverse.
_Avoid_: autonomous adjustment, silent update

**AI Coach**:
The user-facing wellness coach that discusses the user's data and explains deterministic coaching recommendations. It does not independently alter the plan.
_Avoid_: autonomous coach, medical advisor

**Evidence Snapshot**:
The aggregate figures a Plan Change cited, frozen when it was proposed and independent of any later deletion of the entries they were computed from.
_Avoid_: evidence links, cited entries

**Personal Health Record**:
The single user's on-device collection of nutrition, training, health-signal, plan, and coaching data. Phase 1 has no cloud-hosted personal profile or cross-device replica.
_Avoid_: cloud account, shared health record

**Offline Core Logging**:
The ability to record workout activity, capture Food Drafts, and review an already available plan without connectivity. Recognition and AI features are explicitly deferred rather than silently approximated.
_Avoid_: offline-only app, full offline AI

**Health Signal**:
A measurement read from Apple Health (body mass, workout, sleep, heart rate variability, or resting heart rate), carried with its source and time. A Health Signal is either known or unknown, never assumed to be zero.
_Avoid_: health data, metric, connection

**Signal Provenance**:
The source, sample time, and entry method (device-measured or user-entered) of a Health Signal.
_Avoid_: origin, device

**Other Activity**:
A workout recorded in Apple Health that overlaps no session logged in Motive. It is shown as context and never counts as training volume or as a completed planned session.
_Avoid_: unlogged session, external workout

**Food Draft**:
A photo or text description of a meal captured before recognition, which becomes a confirmed food entry only after its recognized items are reviewed.
_Avoid_: pending entry, unconfirmed log

**Goal**:
The user's current body-composition aim: Fat Loss, Maintenance, or Muscle Gain. Maintenance is the neutral plan state.
_Avoid_: cut, bulk, maintain

**Phase 1 Completion Gate**:
The evidence required to declare the personal-use MVP complete: a successful 14-day personal dogfood, reliable upgrades and data control, target logging speed, and no open critical defects.
_Avoid_: feature complete, code complete
