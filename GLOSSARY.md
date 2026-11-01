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

**Coaching Context**:
The minimal, per-request bundle of daily aggregates, recent cited items, the Plan Change being explained, and the current conversation turns that the AI Coach receives. It is assembled on the device, and nothing outside it leaves the device for coaching.
_Avoid_: user data dump, full history, prompt payload

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
A photo or text description of a meal captured before recognition, which becomes a Food Entry only after its recognized items are reviewed.
_Avoid_: pending entry, unconfirmed log

**Food Entry**:
A reviewed and confirmed record of food eaten, made of recognized items with their portions, assumptions and provenance. Only Food Entries count toward intake; Food Drafts never do.
_Avoid_: food log item, meal record, logged food

**Recipe Estimate**:
A recognized item whose nutrients are computed from a typical recipe of database-matched ingredients, because no direct database match exists for the dish. It is shown as one item with its assumed recipe and always flagged for checking.
_Avoid_: guess, AI estimate

**Meal Slot**:
The section of the day a Food Entry belongs to: Breakfast, Lunch, Dinner, or Snack. It is guessed from when the meal was eaten and can always be changed.
_Avoid_: meal type, meal category

**Goal**:
The user's current body-composition aim: Fat Loss, Maintenance, or Muscle Gain. Maintenance is the neutral plan state.
_Avoid_: cut, bulk, maintain

**Trend Weight**:
The smoothed body weight derived from daily weigh-ins, which nutrition decisions use instead of any single reading.
_Avoid_: current weight, scale weight

**Expenditure Estimate**:
The user's estimated daily energy expenditure, inferred from Logged Day intake reconciled against the change in Trend Weight. It is either known with its evidence or insufficient, never guessed.
_Avoid_: TDEE, maintenance calories, calories burned

**Logged Day**:
A day whose Food Entries are treated as the complete intake for that day when estimating expenditure. Days without entries, days the user marks as not fully logged, and unconfirmed probably-incomplete days are not Logged Days.
_Avoid_: tracked day, complete day

**Under-Floor Signal**:
The flag raised when recent Logged Day intake averages below the user's minimum intake floor. While it is raised, no Plan Change may lower the calorie target.
_Avoid_: low-intake alert, restriction warning

**Training Program**:
The user's own ordered rotation of Session Templates with a target number of sessions per week. Missing a day shifts the rotation; it never skips or orphans a session.
_Avoid_: routine, split, schedule, generated plan

**Session Template**:
A named session in the Training Program (for example "Upper A") listing its exercises, each with its working-set count, rep range and load increment.
_Avoid_: workout, routine, day

**Recommended Set**:
The load and reps the progression rule suggests for the next working set of an exercise. Logging it as-is or adjusting it is how it is accepted. It carries out the existing prescription, so it is never a Plan Change.
_Avoid_: ghost target, set target, suggestion

**Failed Set**:
A working set that falls short of the bottom of its rep range at the recommended load. It is recorded as it happened, without judgment.
_Avoid_: failure set, missed set

**Stall**:
An exercise that has had a Failed Set in consecutive sessions, or has gained no reps at the same load over consecutive sessions.
_Avoid_: plateau, regression

**Load Reset**:
A Recommended Set that steps an exercise's load down after a Stall and restarts its rep range. It is part of the progression rule, not a Plan Change.
_Avoid_: deload, regression

**Deload**:
A Plan Change that makes one week of sessions lighter across the whole Training Program because many exercises have Stalled. It is distinct from a single exercise's Load Reset.
_Avoid_: recovery week, rest week

**Signal Baseline**:
A Health Signal's typical value for this user, computed from that user's own recent history and compared with recent trends. Without enough known values it is unknown, never assumed.
_Avoid_: normal range, readiness, recovery score

**Warning Sign**:
A message or data pattern suggesting something beyond wellness coaching, either urgent (for emergency services) or for a clinician. It is recognized by fixed rules, and the AI Coach can only add to them, never clear them.
_Avoid_: red flag, safety alert, risk

**Escalation Card**:
The fixed, non-generated card shown for a Warning Sign. It points to emergency services or a clinician and ends coaching on that topic.
_Avoid_: warning popup, safety message

**Phase 1 Completion Gate**:
The evidence required to declare the personal-use MVP complete: a successful 14-day personal dogfood, reliable upgrades and data control, target logging speed, and no open critical defects.
_Avoid_: feature complete, code complete
