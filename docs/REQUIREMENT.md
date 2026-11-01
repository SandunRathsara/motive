# Motive — Product Requirements

> **Name:** "Motive" is a working title and is explicitly changeable. Nothing in this spec depends on it.
> **Deliverable for this phase:** one self-contained `prototype.html` (vanilla HTML/CSS/JS, in-memory mock data, no backend, no real Apple Health access, no AI calls).
> **Tag legend used below:** **[S]** = simulated in the prototype. **[P]** = production requirement that the prototype does not actually implement.

## 1. Product vision

Motive is a personal health and fitness coach that makes recording your body nearly effortless and then uses that record to say something genuinely useful.

The product bets on one asymmetry: **most people quit tracking apps because logging costs more than the insight is worth.** Motive inverts it. Input is minimal, fast, and one-handed — often pre-filled from what you did last time, from a photo, from a barcode, or from one spoken sentence. In exchange, the app ingests Apple Health and Apple Watch signals and produces a calm, evidence-referenced coach that detects drift early (protein collapsing, sleep debt, volume stalling, weight trend flat for three weeks) and adjusts the plan with the user.

**Positioning:** not a calorie database with a chatbot bolted on. A coaching loop where logging is the cheap part.

**Core loop:** Today dashboard → fast workout or nutrition log → synced health signals → insight → plan adjustment → back to Today.

## 2. Primary user

**"Alex," 34, mid-career, lifts 3–4×/week, wants to lose fat without losing strength.**

- Trains 3–4×/week in a commercial gym, phone in hand between sets, often one-handed, watch on wrist.
- Has quit MyFitnessPal-style logging twice: too many taps, gram-level guessing, guilt-heavy UI.
- Owns an iPhone and Apple Watch; already generates sleep, HRV, resting HR, steps and workout data he never reads.
- Goal: **sustainable fat loss** (~0.4–0.6 kg/week), preserve strength, stop the weekend rebound.
- Wants to be told what to change, briefly, once — not lectured daily.
- Secondary persona (same build, not separately designed): **bulking** user adding ~0.25 kg/week, protein-led surplus, same loop.

**Anti-persona:** clinical nutrition therapy, eating-disorder treatment, diagnosed condition management. Motive is wellness guidance only and must escalate out (§12).

## 3. Measurable UX principles

The top principle is **minimal, extremely fast, user-friendly required input.** These are testable, not aspirational.

| # | Principle | Target |
|---|---|---|
| UX-1 | Log one workout set | ≤ 3 taps, ≤ 5 s, **no keyboard** when repeating last session's load |
| UX-2 | Log a saved meal | ≤ 2 taps from Today |
| UX-3 | Log food by photo or barcode | ≤ 15 s including confirmation |
| UX-4 | Log food by one sentence (typed or dictated) | ≤ 10 s, ≤ 1 correction step |
| UX-5 | Manual macro fallback | ≤ 20 s, calories alone is a valid entry |
| UX-6 | Total required input per typical day | ≤ 90 s across food + training |
| UX-7 | Today dashboard readiness | interactive < 1 s (prototype: no network, so effectively instant) |
| UX-8 | One-handed iPhone use | all primary controls in the bottom 40% of the viewport; touch targets ≥ 44×44 pt |
| UX-9 | Required fields | exactly the minimum to compute the value: reps + weight for a set; a calorie figure *or* macros for food. Everything else optional |
| UX-10 | Interruptions | zero blocking modals during an active workout; logging never requires a completed form |
| UX-11 | Cognitive load | one primary action per screen; ≤ 5 visible choices at any decision point |
| UX-12 | Recovery from error | any entry undoable in ≤ 1 tap, with no confirmation dialog |
| UX-13 | Coach output | ≤ 3 sentences per insight; one suggested action; no notification more than once per day |
| UX-14 | Latency feel | every tap produces visible feedback within 100 ms (optimistic UI, in-memory only) |

**Accessibility floor:** WCAG 2.1 AA contrast, dynamic type up to 200% without breaking layout, full screen-reader labels on all logging controls, reduced-motion respected.

## 4. Goals and non-goals

**Goals (MVP)**
1. A user can complete the full daily loop — check Today, log a workout, log food, see synced signals, receive one useful insight — without leaving the app.
2. Logging a set or a meal is faster than any mainstream competitor in a side-by-side tap count.
3. Coach advice is traceable: every claim links to the data that produced it.
4. Targets flex with goal (fat loss vs bulk) and observed weight trend, not just static math.
5. Apple-first ingestion behind a provider-neutral model, so a second provider is additive.

**Non-goals (explicit)**
- Medical diagnosis, treatment, or condition management. No dosing, no lab interpretation, no "you may have X."
- Social feed, leaderboards, challenges. Meal/grocery marketplaces. Wearable hardware. ECG interpretation.
- Multi-user coaching or coach dashboards. Android-first or web-first parity.
- Guilt mechanics: no streak punishment for rest days, no red "over budget" shaming.

## 5. MVP vs later

| Area | MVP | Later |
|---|---|---|
| Auth/account | Local profile, single user [S] | Real accounts, multi-device sync [P] |
| Health data | Apple Health signals pulled from simulated samples: weight, sleep, steps, resting HR, HRV, workouts, active energy [S]; native iOS app required [P] | Write-back, additional providers (Garmin, Oura, Whoop, Google Fit) [P] |
| Workout logging | Strength sessions, exercises, sets × reps × weight, optional RPE, rest timer, last-session prefill | Supersets, drop sets, autoregulation, templates library |
| Nutrition logging | Photo, barcode, natural language, saved meals/recipes, manual macros | Pantry, restaurant search, micronutrients |
| Coach | Rule-based insight engine + scripted conversational responses over mock data [S] | LLM-backed coach with retrieval over user history [P] |
| Plan adaptation | One proposed change at a time, user accepts/declines, versioned | Auto-applied micro-adjustments, mesocycle periodization |
| Platforms | Mobile-first responsive web prototype + desktop layout | Native iOS app, watchOS app, widgets, Live Activity |
| Notifications | In-app only, no push | Push, watch haptics, smart timing |

## 6. User stories

**Daily loop**
- As Alex, I open the app in the morning and know within five seconds whether today is a train day, how yesterday's intake landed, and whether my recovery signals say push or back off.
- As Alex, I can log a set mid-workout with one thumb, gloves on, without typing.
- As Alex, I can log lunch in one sentence and only correct one thing.
- As Alex, I see a single insight worth reading, not a wall of numbers.

**Nutrition**
- As Alex on a fat-loss goal, I see a calorie target and a protein floor, and the app tells me when protein is what's slipping.
- As Alex on a bulk, I see a surplus range and a rate-of-gain check, and I'm warned when gain is too fast rather than cheered.
- As Alex cooking at home, I save a meal once and re-log it with two taps forever after.

**Training**
- As Alex, today's session already shows what I lifted last week, so I only confirm or nudge.
- As Alex, if I fail a set I can record it honestly without the app judging me.

**Signals & coaching**
- As Alex, when my HRV drops and sleep is short for several nights, the coach tells me to hold intensity instead of adding volume — and shows the three nights it's basing that on.
- As Alex, I can ask "why is my weight flat?" and get an answer grounded in my logged intake and weigh-ins.
- As Alex, I can reject a plan change and it stops suggesting it.

**Control**
- As Alex, I can delete any entry or all my health data, and turn off individual signals.
- As Alex, I always know when I'm talking to AI and what data it used.

## 7. Functional requirements

### 7.1 Onboarding & profile
- **FR-1** Single-screen setup: goal type (fat loss / maintain / bulk), current weight, height, training frequency, dietary preference, units. ≤ 6 inputs, skippable, editable later. [S]
- **FR-2** Targets derived from a documented formula (Mifflin-St Jeor BMR × activity factor × goal delta), shown as a range and explained in one line on tap. [S]
- **FR-3** Protein target per kg bodyweight (fat loss 1.6–2.2 g/kg; bulk 1.6–2.0 g/kg); carbs and fat fill remaining calories. Units and locale switchable (kg/lb, cm/in). [S]

### 7.2 Today dashboard
- **FR-4** Shows: date, recovery/readiness signal, kcal consumed vs target, protein vs floor, next planned session with a one-tap Start, and at most one coach insight. [S]
- **FR-5** Every number is reachable in one tap to its detail view. [S]
- **FR-6** Global quick-add control always visible (bottom-right), offering Food and Set as the two primary actions. [S]

### 7.3 Workout
- **FR-7** Session list by week; today's session pre-selected. Start creates an active session with elapsed timer. [S]
- **FR-8** Each exercise row shows last session's sets as ghost targets. [S]
- **FR-9** Set logging: tapping a ghost target saves it as-is; explicit +/− steppers adjust weight (±2.5 kg / ±5 lb) and reps (±1). Long-press for direct entry. [S]
- **FR-10** Set types: working, warmup, failure; warmups excluded from volume. Optional RPE 1–10 chips, never required. [S]
- **FR-11** Rest timer auto-starts on set save (default 90 s, per-exercise override), visible as a non-blocking bar at the bottom. [S]
- **FR-12** Session summary: total volume, sets per muscle group, comparison to last session, and a single "what to change next time" line. [S]
- **FR-13** Session is editable and deletable; sets can be edited mid-session without leaving the screen. [S]

### 7.4 Nutrition
- **FR-14** Day log grouped by meal (Breakfast/Lunch/Dinner/Snacks) with running totals and remaining kcal. [S]
- **FR-15** Four entry modes available from one picker — none buried in submenus:
  - **FR-15a Photo** — capture or pick image; returns 1–3 candidate foods with portion estimates and confidence; user confirms or edits portion; saves. [S]
  - **FR-15b Barcode** — scan or search a code; resolves to a product with per-serving macros; serving multiplier defaults to 1. [S]
  - **FR-15c Natural language** — free text or dictation, e.g. "two eggs on sourdough with butter and a flat white"; parsed into line items with editable quantities; unparsed fragments flagged inline, not rejected. [S]
  - **FR-15d Saved meals & recipes** — previously logged meals and user recipes with computed per-serving macros; one-tap re-log, portion adjustable. [S]
- **FR-16** Manual macro fallback always available: calories and any subset of protein/carbs/fat; missing macros inferred or left null, never fabricated silently (inferred values marked). [S]
- **FR-17** Every entry editable, duplicable, deletable with one-tap undo; portions edited by common fractions (½, 1, 1½, 2) rather than a numeric field. [S]
- **FR-18** Goal-aware framing: fat loss shows remaining kcal and protein floor; bulk shows surplus range and rate-of-gain status. No red shame states. [S]

### 7.5 Health signals
- **FR-19** Signals view: weight trend (7-day rolling), sleep duration and consistency, resting HR, HRV, steps, active energy, completed workouts, each with a 14-day sparkline and a plain-language "normal for you" band. [S]
- **FR-20** Pull-to-sync with explicit last-synced timestamp and per-type status. [S]
- **FR-21** Signal-level toggles: user can exclude any signal from coaching. Excluded signals stay visible but are not used in insights. [S]
- **FR-22** Conflicts resolved by documented precedence (§10), surfaced when they matter (e.g. Apple Watch workout vs manually logged session). [S]

### 7.6 AI coach
- **FR-23** Insight feed: max 3 cards/day, each with claim, one-sentence evidence, one suggested action, and Accept / Dismiss / Ask-why. [S]
- **FR-24** Chat: free-form questions answered from the user's own data with inline citations ("based on 12 logged days, 9 of which hit protein"). [S]
- **FR-25** Chat is explicitly labeled as AI, with a persistent "uses your data" affordance. [S]
- **FR-26** Coach can propose exactly one plan change at a time; proposal states what changes, why, expected effect, and reversibility. Accept creates a new plan version; decline suppresses that proposal for 14 days. [S]
- **FR-27** Coach never produces medical advice; on warning signs it shows a fixed escalation card and stops coaching on that topic (§12). [S]

### 7.7 Settings
- **FR-28** Edit goal, targets, units, training days, signal permissions, and coach verbosity; export and delete data. [S/P] Export/delete are shown but simulated.

## 8. Information architecture & screen inventory

**Tab bar (4):** Today · Train · Fuel · Coach. Profile via avatar in the Today header. Rationale: the four tabs map 1:1 to the core loop; settings is not a daily destination.

| # | Screen | Purpose | Key elements |
|---|---|---|---|
| S1 | Today | The daily answer | Readiness card, kcal/protein rings, next session, one insight, quick-add |
| S2 | Train — week | Pick or start a session | Week strip, session cards with status |
| S3 | Active session | Log sets fast | Exercise list, ghost targets, steppers, rest bar, finish |
| S4 | Set detail sheet | Adjust or annotate a set | Weight, reps, set type, RPE, delete |
| S5 | Session summary | Close the loop | Volume, comparison, one recommendation |
| S6 | Fuel — day | Food log | Meal sections, totals, remaining, add button |
| S7 | Add food — mode picker | Choose entry method | Photo, Barcode, Describe, Saved, Manual |
| S8 | Photo result | Confirm detection | Candidates, confidence, portion, edit |
| S9 | Barcode result | Confirm product | Product card, serving multiplier, add |
| S10 | Describe result | Confirm parse | Parsed line items, inline-unparsed chips, edit |
| S11 | Saved meals | Re-log fast | Recent, recipes, portion |
| S12 | Manual entry | Guaranteed fallback | kcal + macros, meal slot |
| S13 | Entry detail | Edit or delete | Fields, undo |
| S14 | Signals | Trust the data | Sparkline list, sync, toggles, conflicts |
| S15 | Coach — insights | Daily guidance | Insight cards, actions |
| S16 | Coach — chat | Ask why | Thread, citations, escalation card |
| S17 | Plan | See and change the plan | Current plan version, proposed change, history |
| S18 | You / Settings | Control | Goal, units, permissions, export, delete |

No screen requires scrolling to reach its primary action on a 390×844 viewport.

## 9. Core flows

### 9.1 Today (open → orient → act)
1. Open app → S1 renders instantly from in-memory state. Header: date, avatar.
2. Readiness card: one word (Push / Hold / Recover), the two signals driving it, tap for S14.
3. Rings: kcal consumed/target, protein/floor. Tap → S6.
4. Next session card: name, focus, duration estimate, **Start** (primary button, bottom third).
5. At most one insight card below the fold with Accept / Dismiss / Ask-why.
6. Quick-add (persistent, bottom-right): Food → S7; Set → resumes the active session or last exercise.
7. **Zero state:** a new day shows yesterday's summary plus a single "Log breakfast" affordance; never a blank dashboard.

### 9.2 Workout set logging (the fastest path in the app)
1. S1 → **Start** → S3. Timer starts; first exercise expanded, others collapsed.
2. Each set row is a **ghost chip**: `80 kg × 8` from last session, dimmed.
3. Tap the chip → saved immediately (3 taps total from Today). Toast: "Set 1 · 80×8 · tap to undo."
4. Rest bar appears at bottom with remaining time, +30 s, skip. Non-blocking; logging continues during rest.
5. To change: +/− on weight (±2.5 kg) or reps (±1) before *or* after saving (after = edit). Long-press → S4 for direct entry.
6. Bodyweight sets use a "BW" toggle instead of a weight field.
7. Finish → S5: volume, sets per muscle group, comparison, and one line — "Bench held, rows dropped 2 reps — keep load next week."
8. State survives tab switches; closing the tab loses it (prototype limitation).

### 9.3 Nutrition — entry modes
Common to all: entry ends on a confirm step with the meal slot guessed from time of day, and exits within two screens.

**A. Photo [S]** — S7 → Photo → seeded image → S8 shows 2–3 candidates with confidence bars and portion multipliers → tap one → confirm → logged. Low confidence prompts "edit portion" instead of blocking.
**B. Barcode [S]** — S7 → Barcode → simulated camera → seeded code resolves to a product → S9 with serving multiplier (½/1/1½/2) → add.
**C. Natural language [S]** — S7 → Describe → text field with mic button (dictation simulated by seeded phrases) → parse → S10 lists items (`2 eggs`, `2 slices sourdough`, `10 g butter`, `flat white`) each with macros and a stepper; unrecognized fragments become grey chips to drop or assign manually → confirm.
**D. Saved meals [S]** — S7 → Saved → recents and recipes with kcal and protein → one tap logs the default portion; chevron adjusts → logged.
**E. Manual fallback [S]** — S7 → Manual → kcal required, P/C/F optional → meal slot → save. Two taps from any failure state.

**Post-entry:** the entry lands in its meal section with a 5 s undo; totals animate; if protein is short after 18:00 the coach may append one line (max once per day).

### 9.4 Health sync
1. S14 lists signals with sparklines, "normal for you" bands, last-synced time.
2. **Sync** shows per-type progress (weight, sleep, HRV, workouts) with a ~1.2 s simulated delay so the state is legible.
3. New data recomputes readiness and affected insights; a changed readiness gets a subtle "updated" marker, never a toast storm.
4. Conflicts surface inline: "Apple Watch logged a 52-min strength workout; you logged Upper A (48 min). Use watch duration?" → resolve, remember per type.
5. Missing data is stated plainly ("No sleep data last night") and lowers insight confidence rather than being estimated.

### 9.5 AI insight / chat
1. Generation: rule engine over seeded data [S]; model over retrieved history [P].
2. Card anatomy: **claim** ("Protein averaged 118 g against a 150 g floor over 9 days") → **evidence** (one line + "see data" scoped to S6/S14) → **action** ("Add a 30 g protein snack after training") → Accept / Dismiss / Ask why.
3. Ask-why opens S16 with the insight pre-loaded and a grounded answer.
4. Chat answers use a fixed shape: direct answer, citation chip for the data used, one next step, offer to go deeper. ~80 words max.
5. Medical or out-of-scope questions → escalation card (§12); the thread continues only on wellness topics.
6. Every AI surface carries a small "AI · uses your data" label.

### 9.6 Plan adaptation
1. Triggers (any): weight trend off-target ≥ 2 weeks; protein adherence < 70% over 10+ days; two consecutive sessions with failed top sets; sleep < 6.5 h for 4+ nights; user request.
2. Coach creates a **proposal** (S17): what changes ("4 → 3 training days, keep Upper/Lower; +100 kcal"), why (evidence line), expected effect with a time horizon, reversibility note.
3. Options: **Apply**, **Not now** (snooze 14 days), **Discuss** (→ chat).
4. Apply → new plan version with timestamp and diff; "Plan v3 · changed today" chip on S1 and in S17 history.
5. Reversible in one tap to the previous version for 7 days. Never more than one pending proposal.

## 10. Data model & source-of-truth rules

Concise entities (in-memory objects in the prototype; a real schema later):

- **Profile** — id, units, height, birth year, activity factor, goalType (cut/maintain/bulk), rateTarget, trainingDays, dietaryPrefs.
- **Goal / Targets** — kcal, protein, carbs, fat; derived, versioned, with `derivedFrom` explanation.
- **Exercise** — id, name, muscleGroup, equipment, isBodyweight.
- **WorkoutSession** — id, date, name, status (planned/active/complete), startedAt, endedAt, source (`manual` | `watch`).
- **SetEntry** — id, sessionId, exerciseId, setIndex, type (warmup/working/failure), weightKg, reps, rpe?, completedAt.
- **FoodEntry** — id, date, mealSlot, name, quantity, unit, kcal, protein, carbs, fat, source (`photo`|`barcode`|`nlp`|`saved`|`manual`), confidence?, inferredFields[].
- **Recipe / SavedMeal** — id, name, components[], perServing macros, timesUsed, lastUsedAt.
- **HealthSample** — id, provider (`appleHealth`|`manual`|...), type (bodyMass, sleep, steps, restingHR, hrv, activeEnergy, workout, dietaryEnergy...), value, unit, startAt, endAt, sourceDevice.
- **SignalAvailability** — per type: state (authorized | notAuthorized | unavailableOnDevice | noSamples), lastSyncedAt, provenance — never a single connection flag.
- **Insight** — id, createdAt, claim, evidenceRefs[], action, status (new/accepted/dismissed), triggerRule.
- **PlanVersion** — id, version, createdAt, changes[], rationale, supersedes, status.
- **CoachMessage** — id, role, text, citations[], createdAt.

**Source-of-truth rules**
1. **Body weight:** Apple Health wins; manual weigh-ins are written as manual-sourced samples and lose to any device sample within the same day. The *trend* (7-day rolling mean) — not any single reading — drives decisions.
2. **Training volume:** manually logged sets are authoritative. A watch workout adds duration/HR context and never fabricates sets. Duplicate detection by overlapping time window + type.
3. **Energy burned:** active energy is context only and is **never** added back to the calorie target by default (prevents the classic over-eating trap). Optional setting, off by default.
4. **Nutrition:** user entries are the only source of intake. Nothing is invented; unlogged meals are unknown, not zero, and insights must say "12 of 14 days logged."
5. **Sleep/HRV/RHR:** device-only. If absent, readiness degrades toward "insufficient data" instead of guessing.
6. **Targets:** derived from profile + goal, overridden only by explicit user edit or an accepted plan change; every change is versioned with its reason.
7. **Time:** all entries carry a local timestamp and a day key; the day boundary is user-configurable (default 04:00) so late-night eating lands on the right day.

## 11. Apple Health & Watch integration constraints (verified)

- **Access path [P]:** no browser page — including this prototype — can read HealthKit. Production requires a native iOS app with the HealthKit entitlement and usage descriptions (`NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription`), plus an optional watchOS app for live workout capture. Prototype sync is mock data, labeled simulated [S].
- **Authorization [P]:** granted per data type **and** per direction (read vs. write), and revocable at any time. A denied read is indistinguishable from "no data," so the app must never report absence as denial — nor treat absence as zero.
- **Availability model [P]:** track per-type state (authorized / not authorized / unavailable on this device / no samples in window) with source provenance (device, app, user-entered) — not a single "connected" boolean. Reads are queries over samples.
- **Data types in scope [P]:** HKWorkout, active and basal energy, activity summary/rings, heart rate including resting HR and HRV, sleepAnalysis, steps, body mass and composition, and dietary energy/macros/micronutrients. Coverage varies by user, device, and source; no type is guaranteed.
- **Watch workouts [P]:** watchOS can save a workout with HR, energy, and distance that syncs via HealthKit, but with little per-set strength detail — watch data supplements, never replaces, manual set logging. Live wrist tracking needs native workout-session support and is out of scope for the prototype.
- **Apple Fitness+ [P]:** there is no public class-catalog API; completed sessions may appear only as generic workouts. No trainer, class-name, or playlist metadata is promised.
- **Privacy & App Review [P]:** health data is subject to strict platform and App Store rules — explicit purpose strings, per-type justification, no ad/analytics sharing, on-device-first handling.
- **Freshness [P]:** sleep and HRV typically arrive after wake; the dashboard must render "readiness not yet available" without an error state.
- **Non-Apple dependencies:** food database/vision recognition and the LLM coach are third-party or server-side, with no guarantee implied here; both are seeded in the prototype (§13).

## 12. AI safety & privacy requirements

- **Wellness only.** General wellness and fitness guidance. No diagnosis, treatment, or ruling out of conditions; never interprets labs, ECG, or symptoms. [S] copy + [P] enforcement
- **No medical claims.** Never "you have / are at risk of X." Use "this pattern can be worth discussing with a clinician." [S]
- **Escalation.** Fixed, non-generated card on warning signs — chest pain, fainting, severe breathlessness, disordered-eating signals (sustained extreme restriction language), sudden unexplained weight change, self-harm language — pointing to a clinician or emergency services as appropriate and pausing coaching on that topic. [S]
- **Eating-disorder guardrails.** No shaming, no "burn off" framing, no praise for undereating, no extreme deficits. Minimum intake floors in plan logic; refuse crash-diet coaching. [S]
- **Evidence transparency.** Every insight and answer cites the entries or samples used, with a path to view them. Insufficient data is stated, not filled. Confidence labels on photo/parse results. [S]
- **User control.** Accept/dismiss every insight; approve every plan change; disable any signal from coaching; delete any entry or all data. AI never changes targets silently. [S/P]
- **Privacy.** Prototype keeps everything in memory (gone on reload). Production: on-device first, explicit consent before any transmission, no ad/analytics sharing of health data, export and hard delete honored, no model training on chat without opt-in. [S/P]
- **Disclosure.** AI surfaces are labeled "AI"; the coach states what data it can see on request.

## 13. Prototype scope

**Single file:** `prototype.html`. Vanilla HTML/CSS/JS. No build step, no dependencies, no network calls, no backend, no real integrations.

**Style:** dark premium — near-black surfaces (#0B0C0E), one restrained accent for action, generous type scale, soft depth, no gradients-as-decoration. Mobile-first; at ≥ 900 px a tailored desktop layout (persistent left rail, two-column Today, centered chat column) — not a stretched phone.

**Simulated with mock data [S]:** all health signals, photo recognition, barcode lookup, NLP parsing, saved meals, coach insights, chat replies, plan proposals, sync progress, dictation.

**Not simulated (absent):** accounts, persistence across reload, push notifications, real HealthKit, real AI, watch app.

**Explicit in-app honesty:** every Health/Watch sync surface is labeled **simulated** and the app states it is a prototype with sample data — one line, no nag.

## 14. Acceptance criteria

- [ ] Today opens with readiness, kcal/protein progress, next session, and exactly one insight; the Start action is visible without scrolling on 390×844.
- [ ] A set can be logged from Today in ≤ 3 taps with no keyboard, and undone in 1 tap.
- [ ] All four nutrition modes plus manual fallback are reachable in ≤ 2 taps from the Fuel screen and each completes to a logged entry with correct running totals.
- [ ] Manual fallback accepts calories alone and marks inferred macros as inferred.
- [ ] Sync updates at least four signal types with visible per-type status, a last-synced timestamp, and a **simulated** label; missing data is stated, never faked.
- [ ] Coach insight shows claim, evidence, action, and all three response options; Accept and Dismiss both change state visibly.
- [ ] Chat answers cite user data and shows the escalation card for a seeded medical question.
- [ ] A plan proposal can be applied, producing a new version visible on Today and in plan history, and reverted in one tap.
- [ ] Keyboard-only and screen-reader pass on all logging flows; contrast meets AA; primary targets ≥ 44 pt.
- [ ] Desktop layout at ≥ 900 px uses the rail + two-column structure with no horizontal scroll.
- [ ] No external requests, no console errors, no layout breakage at 320 px width or 200% text zoom.
- [ ] Seeded scenario below is fully reproducible on load.

## 15. Seeded demo scenario

**"Alex, Wednesday."** Fixed demo clock so the state is deterministic. Fourteen days of history are seeded so trends, adherence rates, and citations have real inputs.

- **Profile:** 34 y, 178 cm, 82.4 kg, fat-loss goal, target 0.5 kg/week, 4 training days, kg units.
- **Targets:** ~1,950 kcal (maintenance 2,450 − 500), protein 150 g, carbs 190 g, fat 65 g.
- **Signals:** 7-day weight trend 82.6 → 82.4 (on target, slightly slow); sleep last night 6 h 50 m, 3-night average 6 h 20 m; HRV 42 ms (−8% vs 14-day baseline); resting HR 58 bpm (+3); steps 3,120 by 09:00; active energy 310 kcal; watch workout logged Tuesday.
- **Nutrition so far:** breakfast via photo (2 eggs, sourdough, butter, flat white — 610 kcal, 28 g protein); lunch logged from a saved meal "Chicken rice bowl" (720 kcal, 52 g protein). Remaining ~620 kcal, protein 70 g short.
- **Training:** today is *Upper A* (bench, row, overhead press, pulldown) with last week's loads as ghost targets; one exercise has a 2-rep drop to surface honestly in the summary.
- **Insight on load:** "Protein is averaging 118 g against your 150 g floor over the last 9 days, and your 3-night sleep average is 6 h 20 m. Hold training volume this week and add one protein-forward snack — the deficit is working (weight down 0.2 kg)."
- **Pending plan proposal (pre-seeded, unactioned):** reduce 4 → 3 training days and add 100 kcal, justified by sleep debt and flat 14-day weight trend; reversible.
- **Chat seed:** one prior exchange where Alex asked "why is my weight flat?" with a cited answer, so the thread isn't empty.

**Design intent of the seed:** demonstrate a user who is *mostly* doing the right thing, where the value is catching a protein/sleep drift before it becomes a stall — not a hero's journey or a rescue story.

## 16. Open questions

1. **Name.** "Motive" is a placeholder; naming happens outside this spec.
2. One composite "readiness" score, or only the underlying signals? A score is friendlier but easier to distrust. *Leaning: show the label, keep inputs one tap away.*
3. Should active energy ever adjust the calorie target? Assumption: no by default, though many users expect it — needs confirmation.
4. Photo-first eating: does confidence-based confirmation protect trust, or does one bad estimate cost more than the saved time? Needs usability testing.
5. Dictation in MVP or typed-only? High value one-handed, but adds iOS permission surface.
6. Onboarding: 6 inputs, or zero-input by importing weight/height from Health? Zero-input is on-brand but risks bad targets.
7. Weekends: separate Fri–Sun targets, or one target with a weekly average? Simpler vs. adherence framing.
8. Should the coach ever speak first, or only when the app opens? Prototype is in-app only.
9. Protein floor vs calorie ceiling — which reads as the harder constraint when both are missed?
10. Production retention period and export format; blocks any real launch.

## 17. References (Apple platform documentation)

- HealthKit data types — https://developer.apple.com/documentation/healthkit/data-types
- Authorizing access to health data — https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- Running workout sessions — https://developer.apple.com/documentation/healthkit/running-workout-sessions
- About the HealthKit framework — https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- Protecting access to users' health data — https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web
- HKMetadataKeyAppleFitnessPlusCatalogIdentifier — https://developer.apple.com/documentation/healthkit/hkmetadatakeyapplefitnesspluscatalogidentifier
