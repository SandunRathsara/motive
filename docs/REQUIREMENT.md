# Motive — Phase 1 Product Contract

> **Status:** authoritative Phase 1 product contract (1 November 2026). It replaces the HTML-prototype PRD, which remains in git history.
> **Name:** "Motive" is a working title and is explicitly changeable. Nothing here depends on it.
> **Design reference:** `prototype.html` is a frozen visual reference. Wherever it differs from this document, this document wins.
> **Vocabulary:** terms in **bold capitals** (Food Draft, Plan Change, Trend Weight, …) are defined in `GLOSSARY.md`.
> **Technical contracts** are referenced here, not restated. They live in `docs/TECH_STACK.md` §6: **PHR-1** (Personal Health Record persistence and lifecycle), **HK-1** (HealthKit read scope and provenance), **AI-1** (AI proxy and health-data transmission boundary, with its escalation amendment) and **FR-1** (food recognition pipeline and provider benchmark).
> **Provenance:** each section ends with the roadmap decisions it comes from. You don't need to read those tickets to implement this contract.

## 1. Product vision

Motive is a personal health and fitness coach that makes recording your body nearly effortless, then uses that record to say something genuinely useful.

The product bets on one asymmetry: **most people quit tracking apps because logging costs more than the insight is worth.** Motive inverts it. Input is minimal, fast and one-handed: a recommended set confirmed in one tap, a meal captured as one photo or one sentence. In exchange, the app reads a small set of Apple Health signals and runs deterministic rules that adapt the plan with the user's approval. An AI Coach explains those rules and answers questions grounded in the user's own data.

**Positioning:** not a calorie database with a chatbot bolted on. A coaching loop where logging is the cheap part.

**Complete Daily Loop:** Today → log training and food → Health Signals sync → one coaching recommendation → review the trend or outcome → back to Today.

## 2. The user

Phase 1 has exactly one user: **the owner**, on their own iPhone.

- Lifts several times a week in a gym, phone in hand between sets, often one-handed. Wears an Apple Watch, whose data reaches Motive only through iPhone Apple Health.
- Has quit logging apps over tap cost, gram-level guessing and guilt-heavy UI.
- Pursues one **Goal** at a time: Fat Loss, Maintenance or Muscle Gain (§5.5).
- Wants to be told what to change, briefly and once, not lectured daily.

**Anti-persona:** clinical nutrition therapy, eating-disorder treatment, and management of diagnosed conditions. Motive is wellness guidance only and escalates out (§5.9).

## 3. Phase 1 scope

### Standing decisions

- **Personal use:** one user, a real iPhone, installed under BUILD-1 (`docs/TECH_STACK.md` §6). No TestFlight and no public distribution.
- **AI Coach explains; rules decide.** Deterministic rules create every **Plan Change**, and the user approves every one. The AI Coach never alters the plan.
- **Apple Watch data arrives only through iPhone HealthKit.** There is no watchOS app.
- **The Personal Health Record lives on the device.** A content-stateless AI proxy is the only server (AI-1). There are no accounts and no cloud sync (PHR-1).
- **Offline Core Logging:** workouts, Food Draft capture and reviewing the existing plan all work offline. Recognition and the AI Coach wait for connectivity and are never approximated.
- **Nutrition capture is photo or sentence only,** always through an editable Food Draft.
- **Plan Changes cover nutrition targets and the training schedule.** There are exactly four kinds (§5.7).
- **Metric units only:** kg, cm, g and ml.
- **The day boundary is fixed at 04:00 local time** for everything day-scoped.

### Non-goals

- Medical diagnosis, treatment or condition management. No dosing, no lab, ECG or symptom interpretation, and no "you may have X".
- Guilt mechanics: no streak punishment, no red "over budget" shaming, no praise for undereating or for gaining faster than planned.
- An AI that changes targets or plans on its own.

### Out of scope for Phase 1

- TestFlight, App Store release, App Review readiness and public onboarding.
- Accounts, authentication, cloud backup of the Personal Health Record and multi-device sync.
- A watchOS app and live in-workout Watch logging.
- Barcode scanning, saved meals and recipes, food search, and a manual calorie or macro mode.
- Android/Health Connect, web or desktop layouts, and non-Apple wearables.
- Social features, leaderboards, marketplaces and coach dashboards.
- Weekday/weekend calorie cycling. Every day has the same target.
- Restoring from an export or importing data. Device loss loses unexported data.
- Push notifications, widgets and Live Activities.
- Insight cards (coach suggestions that aren't Plan Changes) and any coach-initiated conversation.
- Writing to Apple Health, and reading any type outside HK-1.

_Decided in: charting decisions on the Phase 1 MVP roadmap; [Personal Health Record lifecycle](https://github.com/SandunRathsara/motive/issues/7); [Nutrition adaptation rules](https://github.com/SandunRathsara/motive/issues/10)._

## 4. UX principles

The top principle is **minimal, extremely fast, user-friendly required input.** The **Gate** column marks targets checked by the Phase 1 Completion Gate (§10b). Every other row is a design principle that each slice checks in its own acceptance criteria.

| ID | Principle | Target | Gate |
|---|---|---|---|
| UX-1 | Log one repeat working set | ≤ 3 taps from Today, no keyboard; median ≤ 5 s | Taps by Maestro step count; seconds by dogfood median |
| UX-3 | Log a meal by photo | Median ≤ 15 s of **Active Input Time** | Dogfood median |
| UX-4 | Log a meal by one sentence (typed or keyboard-dictated) | Median ≤ 10 s of Active Input Time, ≤ 1 correction | Dogfood median |
| UX-RW | Recognition wait (send → review-ready) | p50 ≤ 8 s, p95 ≤ 20 s | FR-1 benchmark, re-checked on the device |
| UX-6 | Total input per day across food and training | Reported as a daily total | Reported only, not gated |
| UX-7 | Today opens fast | Interactive in < 1 s on a warm open, rendered from the Personal Health Record; never waits on Health sync or the network | — |
| UX-8 | One-handed use | Primary controls in the bottom 40% of the screen; touch targets ≥ 44 × 44 pt | — |
| UX-9 | Required fields | Only the minimum: load and reps for a set; one photo or one sentence for a meal | — |
| UX-10 | Interruptions | No blocking modals during an active workout; logging never needs a completed form | — |
| UX-11 | Cognitive load | One primary action per screen; ≤ 5 visible choices at any decision point | — |
| UX-12 | Recovery from error | A saved set or entry can be undone in ≤ 1 tap, with no confirmation dialog | — |
| UX-13 | Coach output | One recommendation slot on Today; chat answers ≤ about 80 words with one next step; no notifications in Phase 1 | — |
| UX-14 | Latency feel | Every tap gives visible feedback within 100 ms. Nothing is labelled saved before the local commit (§5.10) | — |

**Native accessibility checklist:** every slice inherits:
- Dynamic Type at AX3 (the first iOS category ≥ 200%) on a 390 pt width, without clipping. iOS has no exact 200% category: AX2 is about 194%, AX3 about 235%.
- No scroll to reach the primary action on a 390 × 844 pt viewport at the default text size; this rule does not apply at enlarged sizes.
- VoiceOver labels, roles and states on every control; values on logging controls; focus order matching visual order.
- Toasts and undo announced.
- Touch targets and primary-control placement meet UX-8.
- Declared token pairs pass WCAG 2.1 AA; meaning is never color-only (token contract: `docs/ARCHITECTURE.md` §3).
- Reduce Motion replaces animation with a fade or none.

_Decided in: [Phase 1 Completion Gate measurement](https://github.com/SandunRathsara/motive/issues/13); [Food recognition provider selection](https://github.com/SandunRathsara/motive/issues/16); [Food capture contract](https://github.com/SandunRathsara/motive/issues/8); [Slice 1 accessibility checklist](https://github.com/SandunRathsara/motive/issues/19)._

## 5. Requirements

### 5.1 Onboarding and profile (ONB)

- **ONB-1** Onboarding collects, by typing or picking: sex, age, height (cm), weight (kg), daily activity level (three levels), Goal and rate preset (§5.5), and the weekly session target (1–6). It then creates the **Training Program** from the editable starter template (§5.3). Whether any value can be prefilled from Health, and the number of screens, are open (§11).
- **ONB-2** The starting kcal target is the Mifflin-St Jeor BMR × an activity factor of 1.3, 1.5 or 1.7 for the chosen level, plus the Goal's daily offset (NUT-1). It is shown as one number, labelled a starting estimate until the first adaptive review. The starting protein floor follows NUT-2. Onboarding creates Plan v1.
- **ONB-3** Consents are not part of onboarding. Each one is asked before its first network use (COACH-3, FOOD-2).
- **ONB-4** Delete all data returns the app to onboarding (DATA-3).

### 5.2 Today (TODAY)

- **TODAY-1** Today shows:
  - the date;
  - kcal consumed against the target and protein against the floor, as partial totals when an item's nutrients are unknown (FOOD-4);
  - "N meals to review" and a pending-review flag on the day while any Food Draft is pending;
  - the next Session Template in the rotation with a one-tap **Start** in the bottom third, or **Resume** for an active session;
  - at most **one coaching recommendation slot**;
  - at most **one trend line** (SIG-10);
  - the Plan Version chip when the plan has changed ("Plan v3 · changed today");
  - the Under-Floor notice (NUT-10) and any data Escalation Card (SAFE-6).
- **TODAY-2** A pending Plan Change always takes the recommendation slot. With no pending Plan Change, the slot is hidden.
- **TODAY-3** There is **no readiness word and no score.** Values tied to today show "not yet available" until their sample arrives (SIG-8), never as an error.
- **TODAY-4** Every number opens its detail view in one tap.
- **TODAY-5** A quick-add control is always visible, offering **Food** (FOOD-1) and **Set**. Set resumes the active session, or otherwise opens the next session in the rotation.
- **TODAY-6** Zero state: a new day shows yesterday's summary and a single log-food action. Today is never blank.

### 5.3 Training (TRN)

- **TRN-1** **Training Program:** the user writes it as an ordered rotation of **Session Templates**. Each template lists exercises from a small built-in exercise library (name, muscle group, equipment, bodyweight flag), each with a working-set count, a rep range and a load increment. One editable starter template ships, so the first session isn't blank. Motive never generates programming.
- **TRN-2** **Schedule:**
  - The weekly session target is 1–6.
  - A training week runs Monday–Sunday under the 04:00 boundary.
  - Any template can be started, and the rotation continues from the template actually done. A missed day shifts the rotation; it never skips or orphans a session.
  - A session counts as completed, for the rotation and the weekly target, when it is finished with at least one working set.
  - **Other Activity** never counts (SIG-9).
- **TRN-3** **Active session:** Start opens the session with an elapsed timer and the first exercise expanded. Each working set shows a chip:
  - The main value is the **Recommended Set**; last session's actual set is secondary text ("last 80 × 9").
  - One tap logs the chip as shown. A toast offers one-tap undo.
  - Steppers adjust load by the exercise's increment and reps by ±1, before or after saving (after saving, it's an edit). A long-press opens direct entry.
  - On an exercise's first session there is no Recommended Set. The first load is set with the steppers or a long-press, and later sets copy it.
  - Bodyweight exercises take reps only.
- **TRN-4** **Set types:** only **working** and **warmup**.
  - Warmups are optional, get no recommendation, and are excluded from volume and progression.
  - Extra working sets beyond the prescribed count add to volume but are ignored by progression.
  - RPE/RIR is not collected.
- **TRN-5** **Progression (double progression):** inputs are load and reps only. Progression state belongs to the exercise **within its Session Template**: the same exercise in two templates progresses separately, and the exercise history view combines all its sessions. It is applied session to session, never within a session.
  - **Progress:** every prescribed working set, logged at or above the recommended load, reaches the top of the rep range. The next session adds one increment and resets reps to the bottom of the range.
  - **Otherwise:** the same load, with last session's reps for that set + 1, capped at the top of the range.
  - Only sets logged at or above the recommended load count toward progression.
  - **Default increments** are editable per exercise: barbell 2.5 kg, dumbbell 2 kg, machine or cable 5 kg.
  - **Bodyweight** exercises progress by reps only and stay at the top of the range once they reach it. Added load isn't offered.
  - Changing a template exercise's rep range keeps its last load and moves reps to the new bottom. Swapping in a different exercise starts it with no history.
- **TRN-6** **Failed Set, Stall and Load Reset:**
  - A **Failed Set** (below the bottom of its range at the recommended load) is recorded as it happened, without judgment. The next session repeats the same load.
  - A **Stall** is 2 sessions in a row with a Failed Set, or 3 in a row with no rep gain at the same load.
  - After a Stall, the next Recommended Set is a **Load Reset**: about −10% rounded down to the increment, reps back to the bottom of the range, and one reason line ("Reset after 2 sessions under 6 reps"). A Load Reset is part of the progression rule, never a Plan Change.
- **TRN-7** **Rest timer:** starts automatically when a set is saved (default 90 s, overridable per exercise). It is a non-blocking bar at the bottom with +30 s and Skip. Logging continues during rest.
- **TRN-8** **Session summary:** volume from working sets, sets per muscle group, a comparison with the last session of that template, and one deterministic "next time" line built from progression outcomes ("Bench moves to 82.5 × 6; Row repeats 60 kg after 1 Failed Set"). It is computed offline. The AI Coach does not generate it.
- **TRN-9** **Edits:**
  - Sets can be edited mid-session without leaving the screen. Sessions are editable and deletable.
  - Recommended Sets and Stall state are computed when a session finishes, and recomputed immediately when past sets are edited or deleted.
  - Evidence Snapshots already proposed stay frozen.
- **TRN-10** **Training review** runs at the first app open after a training week closes, after the Health refresh on open has been attempted. It runs offline from the Personal Health Record. Skipped reviews aren't replayed. It evaluates the two training Plan Change rules:
  - **Frequency Change:**
    - Proposes target − 1 when completed sessions fell short of the target in each of the last 3 closed weeks, and target + 1 when they exceeded it in each of the last 3.
    - The target stays within 1–6 and moves by one per Plan Change. Templates and rotation order are unchanged.
    - The rule isn't evaluated until the Training Program has existed for 3 full weeks.
  - **Deload:**
    - Proposed when at least half of the program's exercises with 3 or more sessions of history have Stalled within the last 14 days.
    - The next N sessions (N = the weekly target) keep the same recommended loads and halve working sets per exercise, rounded up.
    - Progression and Stall counting pause. Deload sessions are excluded from later progression history, and progression afterwards resumes from the pre-Deload loads.
    - There are no scheduled, periodic or user-started deloads.
  - Motive never swaps exercises, adds sets or changes rep ranges automatically.
- **TRN-11** **Health Signals have no authority over training.** Sleep, HRV and resting HR never change a Recommended Set and never trigger or contribute to a training Plan Change. They appear only as context (SIG-10, COACH-2, Evidence Snapshots labelled "not used in the decision").
- **TRN-12** The user's own edits to the Training Program or its templates take effect immediately as a Plan Version with the source *Your edit* (PLAN-5). They are not Plan Changes.
- **TRN-13** All of training works offline.

_Decided in: [Training adaptation and readiness rules](https://github.com/SandunRathsara/motive/issues/11); [Plan Change lifecycle](https://github.com/SandunRathsara/motive/issues/12)._

### 5.4 Food capture (FOOD)

- **FOOD-1** **Two capture modes**, both one tap from the add-food sheet:
  - **Photo:** one photo per draft, from the camera or the library, with an optional one-line caption. A meal that needs two photos is two drafts.
  - **Describe:** one typed sentence. Dictation uses only the iOS keyboard's mic. There is no in-app speech recognition and no speech permission.
- **FOOD-2** **Draft lifecycle:**
  - **Save first.** Capture writes the Food Draft locally before any network call. The meal time is fixed at capture and never changes because recognition happened later.
  - **Online, with Food recognition consent:** recognition starts immediately. The user waits on the review screen but can leave at any time, and the draft keeps processing while the app is in the foreground.
  - **Offline:** drafts queue and submit automatically when the app is in the foreground and online, with retry backoff and their capture time unchanged. There is no background processing.
  - **Edits during recognition** cancel the run and re-queue it. Results for a stale draft revision are discarded.
  - **Without recognition consent:** drafts are saved but never sent. They stay pending with a prompt to enable recognition instead of Retry. Phase 1 has no consent-free path to a Food Entry.
  - **Counting:** a Food Draft never counts toward intake. A day with a pending draft is flagged as pending review, never shown as complete.
  - Drafts never expire.
- **FOOD-3** **Recognized items** show:
  - name and preparation;
  - portion in human units with grams or ml beneath;
  - kcal and protein, with carbs and fat on expand;
  - plain-language assumptions ("assumed 1 tbsp butter").
  A composite dish is one item, never also split into ingredients.
- **FOOD-4** **Nutrients come only from matched USDA FoodData Central record(s), never from the model** (FR-1).
  - A dish with no acceptable direct match is a **Recipe Estimate**: one item, its nutrients summed from the FDC-matched ingredients of a typical recipe, showing that recipe, with a Check badge ("estimated from a typical recipe"). Portion chips scale the whole recipe.
  - Unknown nutrients display as "—", never 0. Affected totals render as partial ("protein ≥ 42 g · 1 item unknown").
- **FOOD-5** **Review and editing:**
  - **Portion:** multiplier chips (½, ¾, 1, 1½, 2 of the estimate), plus an optional exact amount for weighed food.
  - **Identity:** pick one of up to 3 stored alternatives, or type a one-line clarification that re-recognizes just that item.
  - **Remove** an item in one tap; **add** an item by sentence.
  - **Unresolved fragments** appear as grey chips with Clarify / Drop. Confirm reads "Confirm without N items", so nothing is dropped silently.
  - There is no food-search screen and no macro field.
- **FOOD-6** **Confidence is qualitative:** a **Check** badge with a reason ("portion guessed", "match uncertain") on any item whose identity, portion or match is uncertain. No percentages or bars. Nothing is confirmed automatically, and a badge never blocks Confirm.
- **FOOD-7** **Failure:**
  - **Technical failure** (offline, timeout, provider error): the draft stays intact and shows "Couldn't process yet". It retries automatically, and a manual Retry is always available. An attempt ends after 45 s overall, into this state.
  - **Nothing recognized:** the draft goes to review with "Couldn't recognize this", offering **Describe it** (adds a sentence to the same draft and re-runs) or **Discard**.
  - A draft with zero items can't be confirmed. Nothing is fabricated.
- **FOOD-8** **Meal Slot** is guessed from the meal time (capture time; for a library photo, its taken time if within the last 24 h): Breakfast before 10:30, Lunch 10:30–15:00, Dinner 17:00–22:00, otherwise Snack. Slot and time are editable on review. The Food Entry's day follows the 04:00 boundary.
- **FOOD-9** **After confirmation:**
  - The Food Entry reopens in the same review screen with all edits, slot and time.
  - Its photo is already deleted (PHR-1), so there is no photo re-recognition. Clarification sentences work online, and stored alternatives allow identity swaps offline.
  - Deleting a Food Entry has a 5 s undo. Discarding a draft is one tap with a 5 s undo, and the photo is deleted when the undo window closes.
- **FOOD-10** **Provenance** on every Food Entry (kept in the export):
  - capture type (photo or sentence);
  - the original sentence or caption;
  - per-item assumptions and a user-edited flag;
  - the permanent FDC snapshot per item: FDC ID, data type, publication version, nutrient values per 100 g and gram conversion (FR-1).
- **FOOD-11** **Fuel day view:** pending drafts first, then Food Entries grouped by Meal Slot, with running totals and the remaining kcal.
- **FOOD-12** Food text (descriptions, captions, clarifications) is checked on the device for Warning Signs (SAFE-3). On a match the draft still saves, and the card appears next to it.

_Decided in: [Food capture contract](https://github.com/SandunRathsara/motive/issues/8); [Food recognition provider selection](https://github.com/SandunRathsara/motive/issues/16); [AI data-transmission boundary](https://github.com/SandunRathsara/motive/issues/9)._

### 5.5 Nutrition targets and adaptation (NUT)

- **NUT-1** **Goal rates** are percent of body weight per week:
  - **Fat Loss:** presets −0.25 / **−0.5 (default)** / −0.75; never faster than −1.0.
  - **Maintenance:** 0, with a ±0.1 tolerance band inside which nothing is proposed.
  - **Muscle Gain:** presets +0.1 / **+0.25 (default)** / +0.4; never faster than +0.5.
  - **Daily energy offset** = rate × Trend Weight × 7,700 ÷ 7. One 7,700 kcal/kg constant applies in both directions.
- **NUT-2** **Targets:**
  - a **kcal target**;
  - a **protein floor** of 1.8 g/kg Trend Weight for Fat Loss and 1.6 g/kg for Maintenance and Muscle Gain;
  - a fat minimum of 0.6 g/kg, checked but not shown on Today.
  There is no carb target, and every day has the same target.
- **NUT-3** **Goal framing:** every Goal shows kcal against the target and protein against the floor. Muscle Gain also shows a rate-of-gain status, and gaining faster than planned is framed as such, never as praise. No red shame states.
- **NUT-4** **Active energy** is not read and not used. The **Expenditure Estimate** already reflects real activity.
- **NUT-5** **Logged Day:**
  - A day with no Food Entries is unknown and excluded.
  - The user can mark any day "not fully logged" with one tap, which excludes it.
  - A day with logged intake under 50% of that day's target is flagged as probably incomplete and excluded, unless the user confirms it was complete.
  - Food Drafts never count.
- **NUT-6** **Expenditure Estimate** = mean intake over the window's Logged Days − (the least-squares slope of the raw daily weigh-ins over the trailing 21-day window, in kg/day, × 7,700).
  - It is **known**, when the minimum evidence is met, or **insufficient**, with the shortfall shown ("11 of 14 Logged Days, 5 of 8 weigh-ins").
  - There are no confidence grades and no static-formula fallback. Insufficient means no change.
  - The estimate is visible in a detail view.
- **NUT-7** **Weekly nutrition review:**
  - **Cadence:** every 7 days from the start of the current target version. A review runs on the device at the first foreground open on or after its due date, after the Health refresh on open has been attempted, and works offline. Skipped reviews aren't replayed.
  - **Window:** the trailing 21 days. It may span target versions.
  - **Minimum evidence:**
    - at least 14 Logged Days;
    - at least 8 weigh-ins, with at least 2 in each of the first and last 7 days of the window.
    The first review comes no earlier than day 14 after the starting target.
  - **Damping:** the new estimate moves halfway from the previous estimate toward the window's raw value. At the first review, the previous estimate is the starting estimate.
  - **Proposal:**
    - Proposed target = smoothed estimate + goal offset, rounded to 50 kcal.
    - Nothing is proposed if the change is under 100 kcal.
    - No single Plan Change moves the target more than 250 kcal.
  - Edits or deletions made after a review affect only the next review.
- **NUT-8** **Floor** = the higher of the BMR at current Trend Weight and 1,200 kcal (female) / 1,500 kcal (male).
  - The rule never proposes below the floor. If the chosen rate would need it, the rule proposes the floor and says the rate isn't reachable, suggesting a slower preset.
  - A manual kcal target below the floor is refused in Settings, with the floor and its reason shown.
- **NUT-9** **Rate guardrails** (same minimum evidence):
  - **Fat Loss observed faster than 1.0%/wk:** propose an increase toward the goal rate, never a decrease.
  - **Muscle Gain observed faster than 0.5%/wk:** propose a decrease, framed as "gaining faster than planned".
- **NUT-10** **Under-Floor Signal:**
  - It is raised when the average intake over the last 7 Logged Days is below the floor. While it is raised, no proposal may lower the target.
  - A plain deterministic notice, not a card, shows on Today and in the weekly review: "Your intake has averaged below your floor of [N] kcal over your last 7 Logged Days. Motive won't lower your target while this continues. If some days weren't fully logged, mark them and they'll be left out."
  - Escalation when it persists is SAFE-5.
- **NUT-11** **Protein floor Plan Change:** the protein floor is recalculated only through its own Plan Change, proposed when Trend Weight has moved ≥ 3 kg since the floor was last set.
- **NUT-12** **User edits:**
  - Changing the Goal, rate preset, kcal target or protein floor in Settings takes effect immediately as a *Your edit* Plan Version, not a Plan Change.
  - A Goal change restarts the 7-day review clock and keeps the estimate history. It also withdraws any pending nutrition proposal (PLAN-3).
  - Manual kcal targets are still checked against the floor.
- **NUT-13** **Nutrition Evidence Snapshot** holds aggregates only:
  - the window dates;
  - Logged Days over total days, and the weigh-in count;
  - mean logged intake;
  - the weight slope in kg/wk and %/wk;
  - the raw and smoothed estimates;
  - the previous and proposed targets, and the goal rate;
  - whether the floor or the 250 kcal cap applied.

_Decided in: [Nutrition adaptation rules](https://github.com/SandunRathsara/motive/issues/10); [Safety escalation triggers and detection](https://github.com/SandunRathsara/motive/issues/17); [Plan Change lifecycle](https://github.com/SandunRathsara/motive/issues/12)._

### 5.6 Health Signals (SIG)

- **SIG-1** **Read set, read-only (HK-1):** body mass, workouts, sleep analysis, HRV (SDNN) and resting heart rate. Nothing else.
  - No write types are requested and there is no `NSHealthUpdateUsageDescription`.
  - A type is added only when a Phase 1 rule consumes it, through a new decision record.
- **SIG-2** **Sync:** foreground only, on app open and pull-to-refresh, with no background delivery.
  - Health access is requested from **Connect Apple Health** on S10, shown while the state is `notRequested`. Slice 4 may add an onboarding step.
  - The first sync backfills 90 days for all five types. After that, anchored queries fetch only changes, and deletions remove the cached copy.
  - Normalized samples are cached in the Personal Health Record, so evidence cites stable local sample IDs.
- **SIG-3** **Known or unknown, never zero:**
  - Each type tracks only observable states: `unavailableOnDevice`, `notRequested`, or `requested` with `hasSamples` / `noReadableSamples` / `queryError`, plus the last query and last sample times. Read denial is never inferred or shown.
  - Every value is either known, with its **Signal Provenance**, or unknown, with a reason.
  - Aggregates carry coverage ("5 of 7 nights").
  - The no-data copy reads: "No readable samples in this window. Check Health access and source sync." Never "permission denied" or "0".
- **SIG-4** **Provenance display:**
  - Detail views show the source name, sample time, the type's last sync and a label on user-entered samples.
  - Today shows a value's age only when it is stale, and a source label only when the source isn't the usual one.
  - The usual source for weight and sleep is the source with the most samples in the last 30 days; HRV and resting HR use the SIG-7 baseline source.
- **SIG-5** **Weight:**
  - Weight comes only from Health. There is no weigh-in inside Motive.
  - The day's weight is the **earliest sample of the day** (04:00 boundary) from any source, user-entered included. A day with no weigh-in is unknown and never interpolated.
  - Displayed **Trend Weight** is the average of days with a value in the trailing 7 days ending today; it is unknown with no values.
  - The latest weight is the day's weight (earliest sample) of the most recent day with a weigh-in, shown with its age and labelled stale after 7 days; only values within the trailing window feed the trend.
- **SIG-6** **Sleep:**
  - **One source per night, never summed.** Preference: Apple Watch > other wearable or bed device > iPhone / in-bed-only > user-entered.
  - Source class comes from the device model when present, otherwise **other**. It is never inferred from a source or device name.
  - Duration is the total of the asleep stages (core, deep, REM, unspecified), excluding in-bed and awake time.
  - A night belongs to the day you wake up under the 04:00 boundary. Only the longest block counts, with gaps under 1 h merged, so naps are left out.
- **SIG-7** **HRV and resting HR:**
  - Device-measured samples only; user-entered samples are excluded.
  - Each type has **one baseline source**: the source with the most samples in the last 30 days; the most recent sample wins a tie. Other sources are displayed but kept out of baselines and trends. If the baseline source changes, only values since the switch count.
  - The daily value is the mean of the baseline source's samples for that day.
- **SIG-8** **Staleness:** last night's sleep and today's HRV and resting HR are unknown without a sample for today. Earlier values are never carried forward.
- **SIG-9** **Workouts:**
  - A Health workout links to a Motive session when their windows overlap by **≥ 50% of the shorter one**, whatever the workout type. If several qualify, the largest overlap is linked; the rest become **Other Activity**.
  - Motive's sets and start/end times are authoritative; a linked workout adds context only.
  - Other Activity is shown as context and never adds volume or completes a session.
  - There is no "use Watch duration?" prompt and no manual link or unlink.
- **SIG-10** **Signal Baseline and the Today trend line:**
  - **Last 7** includes today when known.
  - **Baseline:** the median of the 28 days before the last 7, needing ≥ 14 known values, otherwise unknown. Coverage is shown with every figure.
  - **Trend line:** at most one, chosen in the order sleep > resting HR > HRV, and shown only when:
    - **Sleep:** the last-7-night mean is ≥ 30 min under baseline, from ≥ 4 nights;
    - **Resting HR:** the 7-day mean is ≥ 3 bpm above baseline, from ≥ 4 days;
    - **HRV:** the 7-day mean is ≥ 10% under baseline, from ≥ 4 days.
  - Never based on a single-day reading. Nothing shows when no signal deviates or data is insufficient.
  - Tapping the trend line opens S11 for its signal.
- **SIG-11** **Signals screen (S10):** opened from the **Health Signals** row in Settings. Shows weight and Trend Weight, sleep, resting HR, HRV and linked workouts or Other Activity. Each has a 14-day sparkline, its Signal Baseline where defined, its per-type status and the last-synced time. Pull-to-refresh syncs.
- **SIG-12** **Excluding a signal:** it is turned off in Apple Health's permissions, not in Motive. Cached history is kept and ages out of today-scoped values and trends through SIG-8 and the window rules. **Delete this signal's history** purges the cached type and resets its anchor. Empty reads leave the reset anchor null; restoring access re-imports the full backfill window. The confirmation states that Apple Health keeps its own data: turn off access in Apple Health first, or the next sync reads the history again.

_Decided in: [Health signal read set and provenance policy](https://github.com/SandunRathsara/motive/issues/6); [Training adaptation and readiness rules](https://github.com/SandunRathsara/motive/issues/11); [HealthKit integration approach for Expo](https://github.com/SandunRathsara/motive/issues/2); [Slice 3: Health Signals](https://github.com/SandunRathsara/motive/issues/21)._

### 5.7 Plan Changes and Plan Versions (PLAN)

- **PLAN-1** **Kinds:** exactly four deterministic rules create Plan Changes:
  - **kcal target** (NUT-7, NUT-8, NUT-9);
  - **protein floor** (NUT-11);
  - **Frequency Change** (TRN-10);
  - **Deload** (TRN-10).
  Nothing else proposes. The user changes targets or the Training Program by editing them directly.
- **PLAN-2** **Anatomy:** a proposal states what changes (fixed before and after values), why (its **Evidence Snapshot**), the expected effect with a time horizon, and how to reverse it. Each Plan Change has its own number (#n).
- **PLAN-3** **States:** Proposed → Applied | Declined | Superseded, and Applied → Reverted.
  - A pending proposal is **Superseded** when the next review of the same kind runs, or when the user edits the same field: kcal or Goal for a nutrition proposal, the weekly target for a Frequency Change.
  - A Goal change withdraws any pending nutrition proposal.
  - Proposals never expire with time and can't be edited in place.
- **PLAN-4** **Actions:**
  - **Apply** (works offline).
  - **Not now** (declines it).
  - **Why?** always opens the deterministic explanation first, offline and without consent. From there, **Ask the coach** opens chat when online with AI Coach consent.
  - **Revert** is shown on an applied change while it is reversible.
- **PLAN-5** **One pending change:**
  - Strictly one pending Plan Change across both domains.
  - When several are due, the priority is **kcal target > Deload > Frequency Change > protein floor**.
  - Held candidates aren't frozen. When the slot frees, the next one is re-evaluated against current data and shown only if its rule still fires and it isn't suppressed.
  - kcal and protein are never bundled.
- **PLAN-6** **Plan Versions:**
  - One sequence ("Plan v1, v2, …") covers nutrition targets and the Training Program, and is only ever added to.
  - Every applied Plan Change, user edit and revert creates a version, recording the changed fields (from → to) and its source: *Plan Change #n*, *Your edit* or *Revert of #n*.
  - Any version that changes nutrition targets resets the 7-day nutrition review clock. A training-only version doesn't.
- **PLAN-7** **Taking effect:**
  - **Nutrition** changes apply immediately, including to today's rings and today's 50% probably-incomplete check.
  - **Training** changes apply from the next session started. A session in progress never changes. A Frequency Change doesn't reset the current week's count, and the new target is judged from the next closed week.
  - A pending proposal affects nothing.
- **PLAN-8** **Revert:**
  - Available for 7 days after Apply, or until a later Plan Version changes the same field, whichever comes first.
  - It restores only the fields that Plan Change changed, keeps other changes made since, and creates a *Revert of #n* version. No reason is asked for.
  - Reverting a Deload ends it early. Deload sessions already done stay excluded from progression history.
- **PLAN-9** **Suppression:** Not now and Revert suppress the **same kind and direction** (up or down; Deload has no direction) for 14 days.
  - Reviews still run and estimates still update.
  - The opposite direction isn't suppressed.
  - When suppression ends, nothing is brought back; the next review starts fresh.
- **PLAN-10** **Surfacing:** in-app only. A proposal appears after the review that creates it, as Today's recommendation card and in the **Proposed** section at the top of the Plan screen, until it's resolved.
- **PLAN-11** **Plan screen history:**
  - Plan Versions are listed newest first, with number, date, source and diff ("kcal 2,350 → 2,200").
  - A version from a Plan Change opens its Evidence Snapshot and deterministic explanation.
  - Declined and superseded proposals are listed collapsed and labelled.
  - Everything is kept until delete-all. An Evidence Snapshot never breaks when its source entries are deleted.
- **PLAN-12** **AI Coach role:** the coach receives the Plan Change and its Evidence Snapshot in the **Coaching Context** and only explains them.
  - It can't apply, decline, revert or edit anything.
  - If the user wants a different value, it points to editing it in Settings, and it never offers its own number to apply.
  - Prose that contradicts the Plan Change's numbers fails validation, and the deterministic explanation is shown instead (AI-1).

_Decided in: [Plan Change lifecycle](https://github.com/SandunRathsara/motive/issues/12)._

### 5.8 AI Coach (COACH)

- **COACH-1** The AI Coach is a wellness coach that discusses the user's data and explains deterministic recommendations. Its output is display-only, with no tools and no ability to change anything.
- **COACH-2** **Chat:**
  - Free-form questions are answered only from the Coaching Context (AI-1).
  - **Answer shape:** a direct answer, citation chips for the data used, one next step and an offer to go deeper, about 80 words at most.
  - Citations are request-local evidence refs mapped back on the device and open the cited data. Insufficient data is stated, never filled in.
  - Coach questions about a meal use its confirmed line items, never its photo.
- **COACH-3** **Consent:** **AI Coach** consent is asked once, before the first coach request. It names the provider, what is sent, its retention and what works without it, and it is revocable in Settings. Without it, Coach shows only deterministic explanations.
- **COACH-4** **Labelling:** every AI surface carries "AI · uses your data", linking to **What the coach can see**, which shows the last Coaching Context sent.
- **COACH-5** **Threads:**
  - Chat history stays on the device only.
  - Each request carries the current thread's last 6 turns.
  - A new thread starts with none of the previous thread's turns.
- **COACH-6** **Offline and failure:**
  - Offline, the composer is disabled and questions aren't queued.
  - Every timeout, refusal, failed validation or reached cap falls back to the deterministic explanation or "insufficient data", with a plain reason.
  - Unvalidated prose is never streamed.
- **COACH-7** The coach never starts a conversation, and there are no Insight cards. Coaching on Today is only the pending Plan Change (TODAY-2); everything else is the user asking.
- **COACH-8** The model provider is chosen by the AI proxy and provider selection slice (coaching bake-off together with the FR-1 meal benchmark), and recorded as an AI-1 amendment. Until then, only the service contract and a mock adapter exist.

_Decided in: [AI data-transmission boundary](https://github.com/SandunRathsara/motive/issues/9); [Plan Change lifecycle](https://github.com/SandunRathsara/motive/issues/12)._

### 5.9 Safety (SAFE)

- **SAFE-1** **Wellness only:**
  - No diagnosis, treatment or ruling out of conditions.
  - Never interprets labs, ECG or symptoms.
  - Never says "you have / are at risk of X"; uses "this pattern can be worth discussing with a clinician".
  - **Eating-disorder guardrails:** no shaming, no "burn off" framing, no praise for undereating, no extreme deficits, the floor in plan logic (NUT-8), and refusal of crash-diet coaching.
- **SAFE-2** **Warning Signs, in two tiers:**
  - **Urgent → emergency services:** chest pain, fainting, severe breathlessness, self-harm language.
  - **Clinician:** disordered-eating language, sudden unexplained weight change, and medical questions (diagnosis, symptoms, medication, conditions, pregnancy, injury or persistent pain).
  - Sudden weight change and a persistent Under-Floor Signal come from data; all others come from text.
- **SAFE-3** **Text detection:**
  - **Sources:** coach chat and food text.
  - **The on-device phrase matcher runs first,** offline and without any consent. The model's `escalation` field can only add a Warning Sign, never clear an on-device match. When the model sets it, the generated answer is discarded. Recognition has no escalation field.
  - Phrase lists stay tight ("chest pain", never "chest"). A fixture set of true and false positives ("chest day", "nearly passed out laughing") is an acceptance test.
- **SAFE-4** **A matched message isn't sent.** It is stored locally and the **Escalation Card** shows.
  - Text cards offer **That's not what I meant**, which sends the message; the model's escalation check still applies.
  - A text escalation closes the current thread, with the card as its last item. A new thread can start right away. The card fires again if the topic comes up again.
  - There is no timed pause and no resume control.
- **SAFE-5** **Data Warning Signs:**
  - **Sudden weight change:** Trend Weight changes ≥ 3% in either direction within 14 days, under any Goal, with ≥ 6 weigh-ins in the window. It is checked after each weigh-in sync, shows the clinician card and holds no Plan Change.
  - **Sustained Under-Floor:** the Under-Floor Signal is still raised at 2 consecutive weekly reviews. It escalates from the NUT-10 notice to the clinician-tier disordered-eating card.
- **SAFE-6** **Card frequency:**
  - A data card shows once per episode: from the condition becoming true until it clears. It is dismissible (Dismiss only) and returns only after the condition clears and is raised again.
  - Text cards show every time they match.
- **SAFE-7** **Fixed card copy** (meaning fixed; wording may be polished in the slice). `[EMERGENCY]` and `[CRISIS]` come from one fixed region constant, with the numbers checked against an official source.
  - **Chest pain / fainting / severe breathlessness:** "This could need urgent care. If you have chest pain, have fainted, or are struggling to breathe, call [EMERGENCY] now. Motive can't help with this, so this conversation ends here." Buttons: *Call [EMERGENCY]* · *That's not what I meant* · *Close*.
  - **Self-harm:** "You don't have to handle this alone. If you're thinking about hurting yourself, you can talk to someone now at [CRISIS]. If you're in immediate danger, call [EMERGENCY]." Buttons: *Call [CRISIS]* · *Call [EMERGENCY]* · *That's not what I meant* · *Close*.
  - **Disordered eating, from text:** "What you've described can be worth talking through with a doctor or a dietitian. Motive is a wellness coach and can't help with this safely, so this conversation ends here."
  - **Disordered eating, from sustained Under-Floor:** "Your intake has been below your floor of [N] kcal at two weekly reviews in a row. This pattern can be worth discussing with a doctor or a dietitian. If some days weren't fully logged, mark them and they'll be left out."
  - **Weight change:** "Your Trend Weight has changed by [X] kg ([Y]%) in 14 days, faster than your Goal explains. A change this fast can be worth discussing with a clinician."
  - **Medical question:** "That's a medical question, and Motive can't answer it. A doctor or pharmacist can. You can keep asking about training, food and your trends in a new conversation."
- **SAFE-8** **Record:** each escalation is stored with its Warning Sign id, tier, source, time and whether it was overridden. It is included in export and delete-all and never enters the Coaching Context.

_Decided in: [Safety escalation triggers and detection](https://github.com/SandunRathsara/motive/issues/17) (AI-1 escalation amendment)._

### 5.10 Data, privacy and settings (DATA)

- **DATA-1** **The Personal Health Record** is the only source of truth, on the device (PHR-1). Losing the device loses unexported data. The database and app files are excluded from iCloud/Finder backups.
- **DATA-2** **Nothing is labelled saved before its local commit.** A failed commit shows the entry as not saved and keeps it editable.
- **DATA-3** **Deletion:**
  - **Delete entry** removes the row and any attachment.
  - **Delete all data** removes every app-controlled file and all in-memory state, verifies it is gone before reporting success, retries after an interruption, then returns to onboarding.
  - The confirmation states that Apple Health data, already-shared exports and data the AI provider received are outside the promise, and includes the AI-1 retention copy.
- **DATA-4** **Export:** one versioned JSON file covering the full record scope listed in PHR-1, including Gate Metrics, escalation records and pending drafts as text. It is delivered through the share sheet after a plaintext warning. There is no CSV and no import.
- **DATA-5** **Transmission:** data leaves the device only:
  - in the Coaching Context, after AI Coach consent;
  - as the recognition payload (one re-encoded photo with EXIF and location stripped, or text), after Food recognition consent.
  Both consents are revocable. Revoking stops future sends immediately, deletes nothing locally, and shows the AI-1 retention copy. Consents are asked again when the provider, retention terms or data categories change.
- **DATA-6** **Recovery:** data is never reset automatically.
  - If the record can't open, fails integrity or migration, or has a newer schema, a blocking recovery screen offers: retry, restore the pre-migration snapshot, share the raw database, or **Erase and start over** behind a typed confirmation.
  - Rows that fail validation are skipped and reported as a count.
- **DATA-7** **No third-party analytics or crash SDK.** Release logs never contain health values, food text, chat content or file paths.
- **DATA-8** **Gate Metrics and the Phase 1 report:**
  - A small on-device table records only event type, duration, build and timestamp for: Active Input Time per food entry, recognition wait, set-logging duration, and unclean exits. Never health values, food text or chat.
  - A Settings screen reports these figures with medians and p90 (nearest-rank; "—" below 5 samples, always with the count), plus p95 for recognition wait because §10b gates it. Figures are per event type, across all builds by default with per-build counts and a single-build filter.
  - It is on in every Phase 1 build, included in the export and erased by delete-all.
- **DATA-9** **Settings** contains:
  - the Goal and rate preset, the kcal target (floor-checked) and the protein floor;
  - the weekly session target and the Training Program editor;
  - both consents and What the coach can see;
  - **Health Signals**, opening S10;
  - export, delete all data, and delete a signal's history;
  - the Phase 1 report;
  - About, which credits "USDA FoodData Central".

_Decided in: [Personal Health Record lifecycle](https://github.com/SandunRathsara/motive/issues/7); [AI data-transmission boundary](https://github.com/SandunRathsara/motive/issues/9); [Phase 1 Completion Gate measurement](https://github.com/SandunRathsara/motive/issues/13)._

## 6. Information architecture

**Tab bar (4):** Today · Train · Fuel · Coach. Settings opens from the avatar in the Today header. The four tabs map to the Complete Daily Loop; Settings is not a daily destination.

| # | Screen | Purpose | Key elements |
|---|---|---|---|
| S1 | Today | The daily answer | kcal/protein progress, meals to review, next session with Start, one recommendation slot, one trend line, Plan Version chip, quick-add |
| S2 | Train | See the week and start a session | Weekly target progress, next template in the rotation, templates, recent sessions and Other Activity |
| S3 | Active session | Log sets fast | Exercise list, Recommended Set chips, steppers, rest bar, Finish |
| S4 | Set detail sheet | Adjust a set | Load, reps, working/warmup, delete |
| S5 | Session summary | Close the loop | Volume, sets per muscle group, comparison, deterministic "next time" line |
| S6 | Training Program editor | Write the program | Rotation order, templates, exercises with sets, rep range and increment, weekly target |
| S7 | Fuel — day | Food log | Pending drafts, Food Entries by Meal Slot, totals, remaining kcal, Logged Day marking |
| S8 | Add food | Capture | Photo · Describe |
| S9 | Food review | Turn a draft into an entry, or edit an entry | Items, Check badges, portion chips, alternatives, clarify, unresolved fragments, slot and time, Confirm |
| S10 | Signals | Trust the data; opens from Settings > Health Signals | Connect Apple Health while notRequested, per-signal sparklines and baselines, per-type status, last sync, pull-to-refresh |
| S11 | Signal detail | Provenance; the Today trend line opens its signal | Samples with source, time, user-entered label; delete this signal's history |
| S12 | Coach | Ask why | Thread, citation chips, AI label, What the coach can see, Escalation Cards, new thread |
| S13 | Plan | See and change the plan | Proposed section, current Plan Version, history with diffs and Evidence Snapshots |
| S14 | Settings | Control | Targets, Goal, program, consents, Health Signals (S10), export, delete, Phase 1 report, About |
| S15 | Onboarding | Set up | ONB-1 inputs, starting estimate |
| S16 | Recovery | Protect the record | DATA-6 options |

## 7. Data model

The entities below are indicative. Exact schemas are defined by each slice spec under PHR-1, and stable local IDs relate them.

- **Profile:** sex, age, height, activity level.
- **Plan Version:** number, created at, source (*Plan Change #n* / *Your edit* / *Revert of #n*), changed fields from → to. The current nutrition targets (Goal, rate preset, kcal target, protein floor) and Training Program are the latest version's state.
- **Plan Change:** number, kind (kcal / protein / Frequency Change / Deload), direction, state, before and after values, Evidence Snapshot, created at and resolved at.
- **Nutrition review:** date, raw and smoothed Expenditure Estimate or insufficiency with its shortfall, and whether the Under-Floor Signal was raised.
- **Exercise** (built-in library): name, muscle group, equipment, bodyweight flag.
- **Training Program / Session Template / Template Exercise:** rotation order; working-set count, rep range, load increment; progression state per template exercise.
- **Workout Session:** template, started at, ended at, completed, Deload flag, linked Health workout.
- **Set Entry:** session, exercise, index, type (working / warmup), load kg, reps, committed at.
- **Food Draft:** capture type, sentence or caption, photo reference, meal time, revision, recognition state, grounded line items.
- **Food Entry / Food Item:** day, Meal Slot, meal time, provenance (FOOD-10), items with portion, assumptions, user-edited flag, FDC snapshot, up to 3 alternatives.
- **Logged Day status:** day, user mark (not fully logged / confirmed complete), probably-incomplete flag.
- **Health Sample:** the HK-1 provenance DTO. **Signal Availability** and **sync anchors** per type.
- **Coach Thread / Coach Message:** role, text, mapped citations, created at, closed-by-escalation flag.
- **Escalation:** Warning Sign id, tier, source, time, overridden.
- **Consent:** kind, provider, terms version, granted or revoked at.
- **Gate Metric:** event type, duration, build, timestamp.

## 8. Apple platform constraints

- **Access:** HealthKit needs a native iOS app with the HealthKit entitlement and `NSHealthShareUsageDescription`. Expo Go, the web and JavaScript-only packages are not substitutes. HK-2 (`docs/TECH_STACK.md` §6) closes the library gate with the custom local Expo module `modules/motive-healthkit` (`MotiveHealthKit`).
- **Authorization:** granted per type and direction and revocable at any time. A denied read can't be told apart from no data, so absence is never reported as denial or treated as zero (SIG-3).
- **Watch workouts** carry duration and heart rate with little per-set strength detail. They supplement manual set logging and never replace it (SIG-9).
- **Freshness:** sleep and HRV often arrive after waking, so today's values show "not yet available" without an error state.
- **Provisioning:** Until v1, use local Xcode builds signed by the owner's free Personal Team and installed over USB, never under the employer team. Follow BUILD-1 and its free-provisioning amendment (`docs/TECH_STACK.md` §6) for renewal and the later EAS/personal paid-account switch. HealthKit on the free team still needs real-device verification (HK-2).

_Decided in: [HealthKit integration approach for Expo](https://github.com/SandunRathsara/motive/issues/2); [Health signal read set and provenance policy](https://github.com/SandunRathsara/motive/issues/6)._

## 9. Offline behaviour summary

| Works offline | Waits for connectivity |
|---|---|
| All of training, including reviews and training Plan Changes | Food recognition (drafts queue; FOOD-2) |
| Food Draft capture, review of stored alternatives, deleting or editing entries | Clarification sentences and Describe it |
| Nutrition reviews and all Plan Change actions, with their deterministic explanations | AI Coach chat (composer disabled, nothing queued) |
| Safety phrase matching and Escalation Cards | — |
| Health sync (HealthKit is on-device), export, delete, Settings, Plan history | — |

## 10. Acceptance criteria

Feature-level acceptance criteria live in each slice spec. Every slice inherits (a), and the final slice is accepted by (b).

### 10a. Contract invariants

- [ ] A Food Draft never counts toward intake, and a day with a pending draft is never shown as complete.
- [ ] No nutrient value comes from the model. Every value traces to a stored FDC record, and unknown values show as "—", never 0.
- [ ] No Health Signal value is ever assumed, interpolated, carried forward or shown as 0 when unknown. Every aggregate shows its coverage.
- [ ] No plan state changes without Apply or a user edit. The AI Coach has no path to change anything.
- [ ] At most one Plan Change is pending across both domains, and only the four kinds in PLAN-1 exist.
- [ ] No proposal lowers the kcal target below the floor, by more than 250 kcal, or while the Under-Floor Signal is raised.
- [ ] Sleep, HRV and resting HR never change a Recommended Set or a training Plan Change.
- [ ] Plan Versions are append-only, and every Plan Change keeps its Evidence Snapshot after its source entries are deleted.
- [ ] Nothing leaves the device outside the Coaching Context or the recognition payload, and only after the matching consent.
- [ ] Safety matching runs on the device first, offline and without consent, and a matched message isn't sent unless overridden.
- [ ] Nothing is labelled saved before its local commit, and data is never reset automatically.
- [ ] Offline Core Logging works in airplane mode as listed in §9.

### 10b. Phase 1 Completion Gate

The run is recorded in one GitHub issue, **"Phase 1 Completion Gate evidence"**, with a checkbox, date, build and note per item.

**Critical Defect:** any one of the following. Critical Defects are GitHub issues labelled `critical`.
1. **Data integrity:** a committed entry is lost or changed, intake totals are wrong, or a Food Draft counts toward intake.
2. **Privacy:** data leaves the device outside the Coaching Context or recognition payload, a log contains health or chat content, or the Worker stores content.
3. **Safety:** a Warning Sign fixture is missed, an Escalation Card fails to show, or anything changes the plan without Apply.
4. **Rule correctness:** a Plan Change breaks its rule (floor, 250 kcal cap, Under-Floor block, one pending, and so on).
5. **Blocker:** a reproducible crash or dead end in the Complete Daily Loop with no workaround.

Everything else is non-critical. A crash that can't be reproduced is non-critical the first time and critical if it recurs. The crash evidence is the Gate Metrics unclean-exit counter plus crash logs pulled from Xcode's Devices window at the gate review.

**Speed gates:**
- [ ] Maestro critical flows assert their exact step counts, including a repeat set in ≤ 3 taps with no keyboard.
- [ ] Dogfood medians: repeat set ≤ 5 s; photo meal ≤ 15 s of Active Input Time; sentence meal ≤ 10 s with ≤ 1 correction.
  - Sets edited after saving, and drafts left and resumed later, are counted but excluded from the medians.
  - The set timer runs from the chip becoming actionable to the commit, excluding rest.
- [ ] Recognition wait on the device: p50 ≤ 8 s and p95 ≤ 20 s from at least 20 real captures.
- [ ] Reported, not gated: p90 for each target, online capture-to-confirmed (Active Input Time + recognition wait), and daily input total (UX-6).

**14-day dogfood:** 14 consecutive days (04:00 boundary) on one install that keeps its data. A Critical Defect or any data loss restarts the clock once the fix is installed; non-critical defects don't.
- [ ] Every day is a Logged Day.
- [ ] At least 8 weigh-ins arrive through Health.
- [ ] Every session meeting the weekly target is logged in the app.
- [ ] Today is opened every day.
- [ ] At least 3 AI Coach questions are asked.
- [ ] At least 1 offline episode: a workout logged in airplane mode and a Food Draft queued, then recognized on reconnect.
- [ ] At least 1 in-place upgrade runs a schema migration on the real install with no data loss.
- [ ] An export is taken at the end.
- [ ] **End:** the first real nutrition review, at the first open after day 14, gives a conclusive result on real data: a proposal or a reasoned "no change". If it returns "insufficient", the dogfood continues day by day, without restarting, until a review is conclusive.
- [ ] A short retro: what to keep, what to cut, what slowed you down.

**Device checks outside the dogfood:**
- [ ] **Plan Change lifecycle on seeded fixture data:** Apply, Not now, Why?, Revert, 14-day suppression, Deload and Frequency Change.
- [ ] **Destructive checks on a separate verification app variant** (its own bundle ID, sandbox and HealthKit grant, talking to FR-1's dev Worker environment):
  - delete-all, and delete-all interrupted then retried;
  - newer-schema refusal;
  - multi-version upgrades, including skipped versions;
  - export staging cleanup, including after a crash;
  - reinstall with Secure Enclave key re-enrollment.
- [ ] Every build installed on the phone has a git tag, so older builds can be rebuilt as upgrade sources.
- [ ] **Backup exclusion** is confirmed once with a real Finder backup that is then inspected.
- [ ] **AI-1 checks:**
  - the synthetic Worker log test (a distinctive fake body and header plus a forced upstream error, with every log surface inspected and clean);
  - the $10/month hard cap refusing requests once reached;
  - a bad signature, a timestamp outside ±60 s and a replayed nonce each rejected before the body is read;
  - the provider amendment recorded;
  - What the coach can see matching the Coaching Context actually sent.
- [ ] **Safety:** the Warning Sign true/false-positive fixture set passes on the device.
- [ ] No open Critical Defects.

_Decided in: [Phase 1 Completion Gate measurement](https://github.com/SandunRathsara/motive/issues/13)._

## 11. Open decisions

Each item lists what is already fixed. Nothing here may be decided by guessing during implementation.

**Left to a slice spec** (each decided by its slice before implementation):
1. **Onboarding:** whether any ONB-1 input can be prefilled from Health safely, and how few screens it takes. The inputs themselves are fixed (Onboarding slice).
2. ~~Visual language~~ decided: option (a), the prototype's dark-only semantic tokens (`docs/ARCHITECTURE.md` §3; Bootstrap slice, issue #19).
3. ~~Native accessibility criteria~~ decided: the §4 checklist is inherited by every slice (Bootstrap slice, issue #19).
4. ~~Coach initiative~~ decided: no coach-initiated conversation and no Insight cards (COACH-7, TODAY-2).
5. **Emergency region:** the country for `[EMERGENCY]` and `[CRISIS]`, with numbers checked against an official source (Safety slice).
6. **Model provider:** OpenAI or Anthropic, chosen by the FR-1 selection rule (AI proxy and provider selection slice).
7. ~~HealthKit library~~ decided: a custom local Swift Expo module, `modules/motive-healthkit` (`MotiveHealthKit`), under HK-2 (`docs/TECH_STACK.md` §6; Health Signals slice, issue #21). Real-device verification remains required.
8. **Constraint framing:** whether the protein floor or the kcal target reads as the harder constraint when both are missed (Food capture and recognition slice).

**Outside this contract:**
9. **Name:** "Motive" is a placeholder, and naming happens elsewhere.

## 12. References (Apple platform documentation)

- HealthKit data types — https://developer.apple.com/documentation/healthkit/data-types
- Authorizing access to health data — https://developer.apple.com/documentation/healthkit/authorizing-access-to-health-data
- About the HealthKit framework — https://developer.apple.com/documentation/healthkit/about-the-healthkit-framework
- Protecting access to users' health data — https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web

## Appendix A. Legacy ID mapping

How the prototype PRD's IDs map to this contract. "Dropped" names the decision that removed the requirement.

| Old | New | Note |
|---|---|---|
| FR-1 | ONB-1 | Inputs are now sex, age, height, weight, activity level, Goal and rate, weekly session target. Dietary preference and units dropped (metric only). |
| FR-2 | ONB-2, NUT-6–NUT-7 | Starting target is one number, not a range; it adapts weekly. |
| FR-3 | NUT-2 | Carb and fat targets dropped; fat minimum checked only. |
| FR-4 | TODAY-1–TODAY-3 | Readiness signal dropped (Training adaptation and readiness rules). |
| FR-5 | TODAY-4 | |
| FR-6 | TODAY-5 | |
| FR-7 | TRN-1–TRN-3 | Session list by week replaced by the Training Program rotation. |
| FR-8 | TRN-3, TRN-5 | Ghost targets replaced by Recommended Sets. |
| FR-9 | TRN-3 | Stepper size is the exercise's increment. |
| FR-10 | TRN-4 | "Failure" set type and RPE chips dropped (Training adaptation and readiness rules). |
| FR-11 | TRN-7 | |
| FR-12 | TRN-8 | "Next time" line is deterministic. |
| FR-13 | TRN-9 | |
| FR-14 | FOOD-11 | |
| FR-15a | FOOD-1–FOOD-7 | |
| FR-15b | — | Barcode dropped (out of scope). |
| FR-15c | FOOD-1 | Dictation is the iOS keyboard mic only. |
| FR-15d | — | Saved meals and recipes dropped (out of scope). |
| FR-16 | — | Manual macro fallback dropped; failure recovers by editing (Food capture contract). |
| FR-17 | FOOD-5, FOOD-9 | Duplicate dropped. |
| FR-18 | NUT-3 | Surplus range replaced by a rate-of-gain status. |
| FR-19 | SIG-10, SIG-11 | Steps and active energy dropped; "normal for you" band replaced by Signal Baseline. |
| FR-20 | SIG-2, SIG-11 | |
| FR-21 | SIG-12 | Per-signal coaching toggles dropped; excluded through Apple Health permissions (Health signal read set and provenance policy). |
| FR-22 | SIG-9 | Conflict prompt dropped; workouts link by ≥ 50% overlap. |
| FR-23 | COACH-7 | Insight feed dropped (Phase 1 slice sequence and spec breakdown). |
| FR-24 | COACH-2 | Citations are request-local evidence refs. |
| FR-25 | COACH-4 | |
| FR-26 | PLAN-1–PLAN-12 | Rules propose, not the coach; suppression is by kind and direction. |
| FR-27 | SAFE-1–SAFE-8 | |
| FR-28 | DATA-9 | Coach verbosity and signal permissions dropped; units dropped. |
| UX-1, UX-3, UX-4 | §4 | Medians gated; UX-3 barcode dropped. |
| UX-2, UX-5 | — | Saved meals and manual macros out of scope. |
| UX-6 | §4 | Reported, not gated (Phase 1 Completion Gate measurement). |
| UX-7–UX-14 | §4 | Design principles; UX-13 now has no notifications at all. |
| §9.6 triggers | PLAN-1, NUT-7, TRN-10 | "User request", "failed top sets" and "sleep < 6.5 h" triggers dropped. |
| §10 rule 1 (weight) | SIG-5 | Manual weigh-ins dropped; earliest sample of the day. |
| §10 rule 2 (training volume) | SIG-9 | |
| §10 rule 3 (energy burned) | NUT-4 | Active-energy add-back setting dropped. |
| §10 rule 4 (nutrition) | FOOD-4, NUT-5 | |
| §10 rule 5 (sleep/HRV/RHR) | SIG-3, SIG-7, SIG-8 | |
| §10 rule 6 (targets) | NUT-12, PLAN-6 | Versions also record reverts. |
| §10 rule 7 (time) | §3, NUT-5 | Fixed 04:00 day boundary; not configurable. |
| §13, §15 | — | Prototype scope and seeded demo removed; `prototype.html` is a frozen visual reference. |
