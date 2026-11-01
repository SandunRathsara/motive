# Verification notes — Adaptive fitness coaching app landscape

Fact-check round for the four note files (`health_wearable_apps.md`, `stacks_and_evidence.md`, `nutrition_apps.md`, `strength_apps.md`). Scope deliberately narrow: highest-impact, most surprising and most conflicting claims only. All sources below were opened on **1 November 2026** (access date), not merely seen in search snippets, unless marked otherwise.

Verdict vocabulary: **CONFIRMED** (primary source says it), **PARTLY CONFIRMED** (core true, framing/date/scope wrong), **CONFLICTING** (two credible sources disagree), **UNSUPPORTED** (no reliable source found; not the same as false).

---

## Verdict summary

| # | Claim | Verdict |
|---|---|---|
| 1 | Apple Watch Series 12 / Ultra 4 Readiness score shipped Sept 2026, 0–10, four bands, hardware-locked to those two models | **CONFIRMED** |
| 2 | Redesigned Health app (Insights / For You / Longevity / Health Age / nutrition domain) was live for users by 1 Nov 2026 | **PARTLY CONFIRMED — not shipped; beta only** |
| 3 | An "Apple Health+" subscription exists or is announced | **UNSUPPORTED — does not exist; omit** |
| 4 | Fitbit app became Google Health app on 19 May 2026 | **CONFIRMED** |
| 5 | Google Health ↔ Apple Health became two-way in app v5.05 (Aug 2026); HRV does not write | **CONFIRMED** (HRV exclusion now vendor-documented, not merely "reported") |
| 6 | Google/Fitbit readiness = 0–100, High ≥65 / Moderate 30–64 / Low ≤29, 7-night baseline | **CONFIRMED** |
| 7 | Google Health Premium = $9.99/mo or **$79.99**/yr | **CONFLICTING** — Google says **$99**/yr |
| 8 | Google Health Coach shipped globally 19 May 2026, $9.99/$99, Fitbit/Pixel owners first, cross-domain | **CONFIRMED** (one "18+" detail unverified) |
| 9 | MacroFactor Workouts launched 12 Jan 2026; separate app; body metrics shared; no shared coaching; rule-based progression; $89.99/yr bundle | **CONFIRMED** |
| 10 | MyFitnessPal acquired Cal AI; closed Dec 2025, announced 2 Mar 2026; separate app; MFP database | **CONFIRMED** (DB-integration timing needs softer wording) |
| 11 | Carbon Smart Logger launched July 2026; photo + describe, draft-only, cloud | **CONFIRMED** (31 Jul 2026) |
| 12 | Oura exports no HRV to Apple Health | **CONFIRMED** — and it also exports no resting HR (correction) |
| 13 | WHOOP exports no HRV, Recovery or Strain to Apple Health | **CONFIRMED** (vendor statement via convergent secondary sources) |
| 14 | WHOOP clinician video consults live in US summer 2026 | **PARTLY CONFIRMED** — announced 8 May 2026; launch by 1 Nov not verified; paid add-on |
| 15 | Apple's Readiness App Store listing is 2.1/5 from 60 ratings | **CONFIRMED** rating; "dominated by older-hardware complaints" **unverified** |
| 16 | Apple Watch S12: HR every 5 s all day; HRV as often as every 5 min (24×) | **CONFIRMED** |
| 17 | NUTRITION 2026 abstract: 4 photo apps underestimate ~250–345 kcal and ~30 g fat per meal | **CONFIRMED** (conference abstract, not peer reviewed) |
| 18 | JAMA 2025 AI-vs-human DPP non-inferiority RCT | **CONFIRMED** as a real paper; n / percentages not re-verified |

---

## Claim 1 — Apple Readiness on Series 12 / Ultra 4

### Takeaway
**CONFIRMED.** Readiness is a real, shipping, first-party Apple feature as of 1 Nov 2026, and it is hardware-locked to Apple Watch Series 12 and Ultra 4 exactly as the notes say. This is *not* the same thing as the redesigned Health app (see Claim 2) — the notes' conflict comes from treating the two as one release.

**Safest wording for the report:** "Apple shipped a Readiness score with Apple Watch Series 12 and Ultra 4 (available 18 September 2026). It produces a 0–10 score in four bands (Recover 0–1, Pace Yourself 2–4, Ready 5–7, Go For It 8–10), updates through the day, and Apple documents the inputs (activity, daytime and overnight vitals, sleep) but publishes no weights, thresholds or accuracy figures. It is available only on Series 12 and Ultra 4, ages 13+."

### Cited Findings
- "The Readiness app is available on Apple Watch Series 12 and Apple Watch Ultra 4 for ages 13 and older"; score 0–10; inputs = Activity (active calories, workout effort ratings, training load), Vitals (overnight HR, respiratory rate, wrist temperature, HRV, blood oxygen, plus daytime HR, versus a baseline requiring sleep with the watch "at least 7 of the past 49 nights"), Sleep (last night's score + recent history); "Your readiness score updates throughout the day based on calories burned, naps, and your daytime heart rate" — [Apple Watch User Guide, "Use the Readiness app"](https://support.apple.com/guide/watch/readiness-flx4gnzby346/watchos), accessed 1 Nov 2026.
- Bands verbatim: "Go for it: 8–10 / Ready: 5–7 / Pace Yourself: 2–4 / Recover: 0–1"; "Readiness is a general wellness feature and should not be used as a substitute for professional medical judgment" — [Apple Support 128112, published 6 Oct 2026](https://support.apple.com/en-us/128112), accessed 1 Nov 2026.
- Independent confirmation of shipping status and hardware lock: "only those with Apple's latest S11 chip have access to the feature for now. That list includes only the Apple Watch Series 12 and Apple Watch Ultra 4" — [Tom's Guide, 22 Oct 2026](https://www.tomsguide.com/wellness/smartwatches/how-to-unlock-apples-new-dynamic-readiness-score-on-your-apple-watch).
- Reviewers had the hardware but often not yet a score after ~a week, consistent with the 7-night requirement — [MacRumors review, 17 Sep 2026](https://www.macrumors.com/review/apple-watch-series-12-ultra-4/).
- Apple's own claim that Readiness does not need a subscription is corroborated indirectly: CNET (quoted by MacRumors) contrasts Apple giving score drivers "at no additional cost" with Oura's paid detail — same MacRumors review.

### Inferences
- The notes' line "Apple shipped a first-party Readiness app (Sept 2026)" is correct and should be kept.
- Do **not** write that Readiness "shipped as part of the redesigned Health app". It shipped with the watches, surfaces in the Fitness app on iPhone and in the watch's own Readiness app, and is independent of the Health redesign.

### Gaps
- Apple has not said whether Readiness will come to older watches. MacObserver notes "Apple has not said whether Readiness reaches older watches" — [MacObserver, 9 Sep 2026](https://www.macobserver.com/tips/round-ups/apple-health-app-redesign-longevity-tab-health-age-insights-ios-27/).
- Whether any Readiness data type is exposed to third-party apps via HealthKit remains unknown (the notes flag this correctly; nothing found to resolve it).

---

## Claim 2 — Redesigned Health app: Insights, For You, Longevity, Health Age, nutrition

### Takeaway
**PARTLY CONFIRMED — the wrong tense.** All the features described are real Apple-announced features, but as of 1 Nov 2026 the redesigned Health app had **not shipped** to users. It was announced 9 Sep 2026 for "later this year"; it appeared in iOS 27.2 beta 1 (16 Sep), was **removed in beta 4 (13 Oct)**, and iOS 27.2 shipped without it at the end of October. `stacks_and_evidence.md` is right; `health_wearable_apps.md` is wrong to describe the redesign in the present tense and wrong to attach it to "iOS/iPadOS 27" as if shipped.

**Safest wording for the report:** "Apple announced a redesigned Health app on 9 September 2026 — an Insights tab with a For You recommendation section, a Longevity tab scoring seven domains including nutrition, and a Health Age estimate — to arrive 'later this year, starting in U.S. English'. As of 1 November 2026 it had only appeared in iOS 27.2 developer/public betas and had been pulled from the shipping iOS 27.2 release; it is announced-but-unreleased, not a live competitive constraint. It contains no food diary; 'nutrition' is a Longevity domain with habit questionnaires and a Health data category."

### Cited Findings
- "The redesigned Health app will be available later this year, starting in U.S. English, with more languages to follow." Longevity tab "analyzes a user's longitudinal health data for deeper insights into heart health, sleep, mental wellbeing, movement health, metabolic health, hearing, and nutrition"; Health Age "uses Apple Watch data"; Quest lab panel "over 50 key biomarkers for $119" — [Apple Newsroom, 9 Sep 2026](https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/), accessed 1 Nov 2026.
- Beta-only status: "Apple's redesigned Health app is currently being tested in the iOS 27.2 beta, but it is not expected to be included in the update's public release later this month… Expect the update before the holidays" — [MacRumors, 12 Oct 2026](https://www.macrumors.com/2026/10/12/apple-new-health-app-in-beta-wont-launch-ios-27-2/).
- Removal from the beta: "iOS 27.2 beta 4 no longer includes Apple's overhauled Health app" — [9to5Mac, 13 Oct 2026](https://9to5mac.com/guides/apple-health/) (guide index; the beta-4 item is dated 13 Oct 2026).
- Still unreleased at end of October: "iOS 27.2 is now rolling out… The final update has shipped without it" — [Gizbot, 27 Oct 2026](https://www.gizbot.com/news/apple-has-been-building-an-ai-health-coach-since-2025-129449.html) (secondary, low authority, but consistent with MacRumors and 9to5Mac).
- Nutrition is a *domain*, not a diary: Longevity assesses "heart health, sleep, mental wellbeing, movement health, metabolic health, hearing, and nutrition", with nutrition-habit screens among the 17 assessments; Browse retains a "Nutrition" data-type category — [Tech Between the Lines, 17 Sep 2026](https://www.techbetweenthelines.com/inside-apples-redesigned-health-app-everything-we-found-in-the-ios-27-2-beta/) (hands-on, beta).
- For You is not fully live even in beta: "personalized guidance in Insights, personalized recommendations, and ordering labs directly through Quest, aren't live yet either" — same hands-on.
- Apple's own product page for Series 12 repeats "A redesigned Health app on iPhone arrives later this year, including a new Longevity tab with a Health Age feature" — [Apple, Apple Watch Series 12](https://www.apple.com/apple-watch-series-12/).

### Inferences
- `health_wearable_apps.md` Q2 ("The redesigned Health app (iOS/iPadOS 27) adds an Insights tab…") and Q4 ("nutrition appears only as a category inside the Longevity tab") both need to be recast as *announced, in beta*. Q2's Gaps note already concedes "announced-and-shipping" — that concession is itself too strong.
- `stacks_and_evidence.md` stack F ("still 'coming later this year' as of 1 Nov 2026") is the correct version and should win.
- The strategic point survives either way: Apple has *announced* an AI-augmented health surface with a nutrition domain, so Motive's "nobody owns the loop" window is time-limited. It should be argued as a timing risk, not a current feature comparison.

### Gaps
- No dated evidence found that the redesign shipped between 27 Oct and 1 Nov 2026. If it shipped in that window, the report's tense changes but nothing else does. Treat "not shipped as of 1 Nov 2026" as very likely but not exhaustively proven.
- Whether Health Age or the Insights/For You layer will be exposed to third parties is undocumented.

---

## Claim 3 — "Apple Health+" subscription

### Takeaway
**UNSUPPORTED — omit entirely.** There is no Apple Health+ product or subscription. It was never announced by Apple; it existed only as Bloomberg-sourced reporting about an internal project, and that reporting says Apple **pivoted away** from a paid service in February 2026 and folded the planned features into the free Health app.

**Safest wording:** "No Apple health subscription exists. Apple's 2026 health features ship free with hardware (the only paid Apple health item announced is a $119 Quest lab panel)." If the report needs the strategic point: "Apple reportedly shelved a planned paid 'Health+' service in early 2026 and is shipping its features inside the free Health app instead."

### Cited Findings
- "Apple has decided to pivot away from plans for a paid 'Health+' service in iOS 27… 'Apple now plans to take some of the features it had planned for the artificial intelligence-powered offering and roll them out individually over time within its Health app'" (Gurman/Bloomberg, reported) — [9to5Mac, 6 Feb 2026](https://9to5mac.com/2026/02/06/apples-latest-ios-27-pivot-is-good-news-for-the-subscription-weary/).
- "Apple has never announced Health+ or plans for the initiative" — [AppleInsider, 6 Feb 2026](https://appleinsider.com/articles/26/02/06/apple-health-scaled-back-internally-will-focus-on-incremental-features-instead).
- Apple's own September 2026 materials describe the redesigned Health app with no subscription, and the only priced item is the $119 Quest panel — [Apple Newsroom, 9 Sep 2026](https://www.apple.com/newsroom/2026/09/apple-advances-health-and-fitness-capabilities-using-apple-intelligence/).

### Inferences
- The notes' inference that Apple's footnote about "expanded access… for a fee in the future" is "a monetisation signal" for health is a **misreading**. That footnote sits on a paragraph about *server-side Apple Intelligence features* (Siri AI on watchOS, Live Rewind/Siri Recap) — [Apple, Apple Watch Series 12 footnotes 8 and 9](https://www.apple.com/apple-watch-series-12/). Using it to imply an imminent paid health tier is the kind of claim a competitor or journalist would immediately falsify. Delete it.
- The notes' own Table entry "Apple Health / Readiness / Health app — Free with hardware" is correct and should stand.

### Gaps
- None material. The negative is well sourced.

---

## Claim 4 — Fitbit becomes Google Health (May 2026)

### Takeaway
**CONFIRMED**, with a better citation than the notes used. The rebrand date is 19 May 2026, stated by Google in two places. Fitbit Premium became Google Health Premium. The notes' citation (TechRepublic, 4 Aug 2026) is an Apple-Health-sync story that mentions the rebrand only in passing; cite Google instead.

**Safest wording:** "Google renamed the Fitbit app to Google Health on 19 May 2026; Fitbit Premium became Google Health Premium, and Google Health Coach launched inside it the same day."

### Cited Findings
- "Starting May 19, 2026, the Fitbit app will become the Google Health app"; "Fitbit Premium will become Google Health Premium" — [Google Health Help 17068213](https://support.google.com/googlehealth/answer/17068213), accessed 1 Nov 2026.
- "The Google Health app starts rolling out to all users on May 19" — [Google blog, 7 May 2026](https://blog.google/products-and-platforms/products/google-health/google-health-app/).
- Fitbit accounts must migrate to Google Accounts; Fitbit-account access ends 19 May 2026 — [Google Health Help 14237024](https://support.google.com/googlehealth/answer/14237024).

### Inferences
- The notes' framing "Fitbit (now Google Health)" is fine for a scope line, but the report should not call the product "Fitbit" in present tense for app-level features.
- `stacks_and_evidence.md`'s "Fitbit app replaced by Google Health app on 19 May 2026" is correct and better dated than the wearable file's "May 2026".

### Gaps
- Which legacy Fitbit features were removed (rather than renamed) at migration is not documented in the pages reviewed.

---

## Claim 5 — Google Health ↔ Apple Health two-way sync; HRV excluded

### Takeaway
**CONFIRMED, and stronger than the notes claimed.** The notes treated the HRV exclusion as "unconfirmed by the vendor" and attributed it to MacRumors/Reddit. Google's own data-type table shows HRV on the *read from Apple Health* side and absent from the *write to Apple Health* side. That is a primary source for the asymmetry — use it.

**Safest wording:** "Google Health v5.05 (3 August 2026) added writing back to Apple Health (workouts, steps, vitals, sleep, nutrition). Sync is now two-way, but not symmetric: Google's own list of types it writes to Apple Health omits HRV, while listing it as a type it reads."

### Cited Findings
- "You can now share your data from Google Health back to Apple Health… exercise records, steps, vitals, and sleep" — [Google Health app 5.05 release notes, 3 Aug 2026](https://support.google.com/googlehealth/thread/456993110/google-health-app-5-05-update-aug-2026?hl=en).
- Vendor data-type table: HRV appears under "Data types that Google Health can read from Apple Health" and is **absent** from "Data types that Google Health can write to Apple Health" (which lists heart rate, oxygen saturation, respiratory rate, resting heart rate, blood glucose) — [Google Health Help 17037331](https://support.google.com/googlehealth/answer/17037331), accessed 1 Nov 2026.
- "Previously, you could only import your Apple Health data into Google Health, but not the other way around" — [The Verge, 3 Aug 2026](https://www.theverge.com/gadgets/974778/google-health-fitbit-data-apple-health-syncing).
- Google Health reads only "three months of your historical data from Apple Health" at present — Google Help 17037331 (same page). *(Not in the notes; relevant if the report discusses backfill.)*

### Inferences
- The notes' "source conflict, resolved by date" (Constant July 2026 vs August release notes) is a correct handling and can stay, but the HRV caveat should now be stated as vendor-documented rather than "reported by users".
- Because Google Health writes *nutrition* to Apple Health, a Motive-style app could receive Google-side meal data. The notes don't say this; it is a genuine, checkable integration fact worth one line.

### Gaps
- Google does not document *why* HRV is read-only (the RMSSD/SDNN explanation is third-party inference).

---

## Claim 6 — Google/Fitbit readiness score bands

### Takeaway
**CONFIRMED** almost verbatim, including the three components and the 7-night baseline. Two small precision issues: the page gives the scale as both "0 to 100" and "1 to 100" in different sections, and it says the *activity* component was **removed** and replaced by resting heart rate.

**Safest wording:** "Google Health's readiness score is a 0–100 (page also says 1–100) score in three bands — High 65+, Moderate 30–64, Low 29 or below — built from sleep over the past week, HRV and resting heart rate against a personal baseline set after 7 nights (a month for a more accurate baseline). Google states the previous 'activity' component was removed and replaced with resting heart rate."

### Cited Findings
- Bands and inputs, plus "you must wear your device for 7 nights of sleep to establish a personalized baseline… Wear your device consistently for a month to develop a more accurate personal baseline" — [Google Health Help 14236710](https://support.google.com/googlehealth/answer/14236710), accessed 1 Nov 2026.
- "we've removed the 'activity' component of the score and replaced it with 'resting heart rate'" — same page.
- Coach behaviour quote used in the notes ("your coach proactively advises adjustments to your training based on your readiness score… you will no longer receive standalone personalized workout recommendations based solely on your score") is verbatim — same page.

### Inferences
- The notes' characterisation of Google's readiness model as "the thinnest documented of the set (three components)" is fair but should note it is also the most transparently *revised* — Google publishes what it removed and why, which none of the others do.

### Gaps
- No explanation of how the three components are weighted.

---

## Claim 7 — Google Health Premium price

### Takeaway
**CONFLICTING.** `health_wearable_apps.md` says Fitbit/Google Health Premium is "$9.99/mo or $79.99/yr". `stacks_and_evidence.md` says "$9.99/month or $99/year". Google's own May 2026 launch post says **$9.99/month or $99/year**. The $79.99 figure is the pre-2026 Fitbit Premium annual price and appears to be stale.

**Safest wording:** "Google Health Premium is $9.99/month or $99/year (raised from Fitbit Premium's $79.99/year at the May 2026 relaunch)."

### Cited Findings
- "included with a Google Health Premium subscription (formerly Fitbit Premium), at just $9.99 per month or $99 per year" — [Google blog, 7 May 2026](https://blog.google/products-and-platforms/products/google-health/google-health-coach/).
- The Google Store pricing page redirected to a region picker on access and could not be read directly — [store.google.com/product/google_health_premium](https://store.google.com/product/google_health_premium?hl=en-US), 1 Nov 2026 (**gap**, not a contradiction).

### Inferences
- Any per-stack "subscription burden" arithmetic in the report that used $79.99 is understated by ~$20/year.
- Google AI Pro/Ultra subscribers now get Health Premium at no extra cost — a bundling fact absent from the notes and relevant to the "stack tax" argument.

### Gaps
- Current US list price could not be read from the store page; the $99 figure rests on Google's launch post and should be dated as such.

---

## Claim 8 — Google Health Coach as the only shipped cross-domain coach

### Takeaway
**CONFIRMED** as a shipped product with cross-domain claims, and it is the single most important competitive fact in the stack notes. One detail in the notes — "only for Fitbit or Pixel Watch owners aged 18+ at launch" — is only half-verified: Google says "eligible Fitbit and Pixel Watch users"; the 18+ element comes from the notes' TechCrunch citation and was not re-read here.

**Safest wording:** "Google Health Coach left preview on 19 May 2026 and is included in Google Health Premium ($9.99/mo or $99/yr). Google describes it as combining fitness and sleep metrics, nutrition and cycle tracking, environmental context and (US) medical records, producing a weekly plan it adjusts from readiness and progress. It launched first for Fitbit and Pixel Watch users; other devices 'coming soon'. Google scopes it as wellness: 'Not intended for medical purposes… Check responses for accuracy; results may vary.'"

### Cited Findings
- Global availability from 19 May 2026; "connect the dots across your shared data ecosystem, including: Fitness and sleep metrics; Nutrition and cycle tracking; Environmental context like location and local weather; Personal medical records"; "Each day, the Coach will make suggestions on what to focus on based on your readiness, your progress, and even the weather"; meal logging "snap photos of meals for nutritional analysis"; pricing $9.99/mo or $99/yr; "launching first for eligible Fitbit and Pixel Watch users, with support for other devices coming soon" — [Google blog, 7 May 2026](https://blog.google/products-and-platforms/products/google-health/google-health-coach/).
- Wellness scoping footnote: "Not intended for medical purposes… Check responses for accuracy; results may vary" — same page, footnote 1.

### Inferences
- `stacks_and_evidence.md`'s claim that Google is "the only shipped consumer product that already claims cross-domain adaptive coaching" survives verification, and is better supported than the notes realised: Google explicitly names nutrition, cycle, environment, records *and* readiness-driven daily suggestions in one product.
- The notes' "closest to yes" grading in the coverage table is right. The report should not soften it to "claims to" without also noting it is the only one that ships.

### Gaps
- Whether the Coach actually alters *strength* prescription (as opposed to cardio/general activity) is not documented; Google's examples are weekly targets and daily focus suggestions.
- The "18+" launch restriction is unverified here.

---

## Claim 9 — MacroFactor Workouts

### Takeaway
**CONFIRMED on every element**: 12 January 2026 launch, separate app, shared body metrics only, explicitly no shared coaching at launch, rule-based (not generative) progression, $89.99/yr bundle. The bundle has a nuance the notes compress: legacy subscribers (active before 1 Jan 2026) get Workouts free until 12 Jan 2027, then $89.99/yr.

**Safest wording:** "MacroFactor Workouts shipped 12 January 2026 as a separate app. It shares body weight, body metrics, weight trend, progress photos, select habits and period tracking with MacroFactor Nutrition, but 'at launch, there are no shared coaching features or automatic program adjustments between nutrition and training.' Its progression is 'driven by rule-based logic, not generative AI.' Pricing is $11.99/mo, $47.99/6 months or $71.99/yr per app; the two-app bundle is $89.99/yr."

### Cited Findings
- "January 12, 2026 — MacroFactor Workouts, our new workout app, is available to download"; "Updates future weight and rep targets based on your actual performance, not a fixed schedule"; "Suggestions update based on the workouts you complete, not the ones you miss" — [MacroFactor Workouts v1.0.1 release notes](https://macrofactor.com/wo-version-1-0-1/), accessed 1 Nov 2026.
- "MacroFactor Workouts and MacroFactor Nutrition are designed as separate apps that work together. Body metrics, scale weight, progress photos, select habits, and period tracking are shared and synced across both apps… At launch, there are no shared coaching features or automatic program adjustments between nutrition and training" — [MacroFactor Workouts product/FAQ](https://macrofactor.com/workouts/), accessed 1 Nov 2026.
- "Smart progression in MacroFactor Workouts is driven by rule-based logic, not generative AI… changes in weight and reps follow clear rules versus black-box guidance" — same page.
- Pricing: "$11.99/month, $47.99/half year, $71.99/year"; bundle "$89.99/year"; legacy subscribers (active before 1 Jan 2026) get free Workouts access "through January 12, 2027" — [MacroFactor Workouts pricing](https://macrofactor.com/workouts/price/), accessed 1 Nov 2026.
- Separate App Store identity (id6737156524) and "Connect to MacroFactor Nutrition" listed as an integration, not a coaching link — [App Store, MacroFactor Workouts](https://apps.apple.com/us/app/macrofactor-workouts-tracker/id6737156524).

### Inferences
- The notes' strongest structural claim — "the market leader in adaptive nutrition has no shared coaching between training and nutrition, by explicit design" — is a **direct quote-level fact**, not an inference. It should be quoted, not paraphrased, in the report.
- The 12 Jan 2026 date is a *release-notes* date and an *availability* date. The product was announced in June 2025 (Stronger by Science survey). If the report says "launched January 2026", that is correct for general availability.

### Gaps
- Whether Workouts ingests sleep/HRV/readiness is still undocumented (the notes are right). Nothing on the product page mentions physiological inputs; the "learning" is explicitly performance-based.

---

## Claim 10 — MyFitnessPal / Cal AI

### Takeaway
**CONFIRMED**, with one wording fix. Deal closed December 2025; announced 2 March 2026; Cal AI stays a separate app; it was integrated with MFP's nutrition database. The notes' phrase "Nutrition DB is MyFitnessPal's **since Dec 2025**" over-specifies: TechCrunch says the integration had happened "since the deal closed in December" as of March 2026 — i.e. the integration is tied to the close, not separately dated.

**Safest wording:** "MyFitnessPal acquired Cal AI; the deal closed in December 2025 and was announced 2 March 2026. Cal AI remains a separate app, now drawing on MyFitnessPal's nutrition database (20 million foods, 68,500 brands, 380+ restaurant chains). MyFitnessPal's CEO frames the split as 'Cal AI is for those preferring speed over accuracy. MFP is for those wanting the reverse.'"

### Cited Findings
- "After deal talks lasting almost a year, MyFitnessPal has successfully acquired its up-and-coming rival Cal AI"; "over 15 million downloads and over $30 million in annual revenue"; "The Cal AI app will remain independent"; "since the deal closed in December… The AI app has now been integrated with MFP's huge nutrition database"; database "spans 20 million foods, 68,500 brands, and meals served at 380+ restaurant chains"; direct quote on speed vs accuracy; "no plans at the moment to integrate the app into its main product" — [TechCrunch, 2 Mar 2026](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/), accessed 1 Nov 2026.
- The team (7 employees + contractors) was retained; CEO Zach Yadegari still runs the app as a unit of MFP — same article.

### Inferences
- The notes' structural inference — consolidation reduces food-database differentiation and shifts competition to coaching — is supported: the two apps now share one database while being marketed on opposite accuracy/speed trade-offs.
- Do not describe this as an "acquisition of Cal AI by MyFitnessPal" in the present perfect without the December close date; the March date is the *announcement*, and reports of the deal had circulated earlier.

### Gaps
- Deal value undisclosed; Cal AI's post-acquisition retention/roadmap beyond "separate app" is not public.

---

## Claim 11 — Carbon Smart Logger

### Takeaway
**CONFIRMED**, including the launch window. Release 77 was published 31 July 2026 and the help-centre article is dated 3 August 2026. The notes' description (photo + "Describe" text/keyboard dictation, draft-only, cloud-required, warns against photos for mixed dishes) matches the vendor page exactly.

**Safest wording:** "Carbon shipped Smart Logger in release 77 (31 July 2026; help documentation 3 August 2026). It turns a meal photo or a typed/dictated description into an editable draft matched to Carbon's verified database; nothing saves without confirmation; photo and description analysis run in the cloud; Carbon explicitly recommends Describe over photos for 'complex mixed dishes like casseroles, stir-fries, or soups.'"

### Cited Findings
- "Release 77 is here… Smart Logger turns your camera into a food search engine. Take a photo of your meal, or type a quick description… Carbon identifies every food and matches each one to a verified entry in our nutrition database" — [Carbon blog, Release 77, published 31 Jul 2026](https://www.joincarbon.com/blog/release-77), accessed 1 Nov 2026.
- "The Smart Logger builds a starting draft, not a finished entry… nothing saves until you confirm"; "Skip photos for complex mixed dishes like casseroles, stir-fries, or soups. Describe those instead"; "Photo and description analysis both run in the cloud. An internet connection is required"; "Your device keyboard's dictation button works for voice food logging. The Smart Logger does not record audio itself" — [Carbon Help, 3 Aug 2026](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger), accessed 1 Nov 2026.
- Availability is live, not announced: the help article includes a "Why am I not seeing the Smart Logger in my app?" troubleshooting entry requiring only the latest version and connectivity — same page.

### Inferences
- The notes' "not a dedicated voice pipeline" judgement is exactly right and is a meaningful product distinction: Carbon has *dictation into a text box*, not conversational voice capture. Keep the wording.
- "Launched July 2026" is safe. "Launched 31 July" is safe if dated to release 77.

### Gaps
- No first-party statement on regional/paywall availability of Smart Logger; no vendor accuracy figures (the help page deliberately says only "accurate starting point").

---

## Claim 12 — Oura Apple Health exports

### Takeaway
**CONFIRMED for HRV absence**, and there is a correction to make: Oura's documented export list also omits **resting heart rate** (it exports heart rate at 1-minute intervals) and omits SpO2. `stacks_and_evidence.md` stack C says Oura/WHOOP send "sleep, HR, RHR… no HRV" — the RHR part is wrong for Oura.

**Safest wording:** "Oura exports to Apple Health: active energy, heart rate at 1-minute intervals, height, mindful minutes, respiratory rate, sleep with stages, steps, weight, workout routes and workouts. It does **not** export HRV, resting heart rate or SpO2, and it does not export its Readiness score. Imports from Apple Health include heart rate, sleep, steps, weight, workouts and body composition."

### Cited Findings
- Full export and import lists, plus "Gen3 or later **with** active membership", "iOS only", and "steps in Oura do not move the Stand Ring because of a limitation from Apple" — [Oura Support, Apple Health Integration, last updated 14 Oct 2026](https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration), accessed 1 Nov 2026.
- Independent cross-check that no proprietary score reaches Apple Health and that Oura's list lacks RHR and SpO2 — [Sensai comparison](https://www.sensai.fit/blog/wearable-apple-health-integration-what-syncs-oura-whoop-garmin), accessed 1 Nov 2026 *(SEO-adjacent source; used only as corroboration of a vendor list already read directly — do not cite it in the report)*.

### Inferences
- The notes' central inference — "the wearable's derived readiness signal is precisely the thing that does not cross the bridge" — holds for Oura, WHOOP and Garmin. It is the most robust cross-product finding in the whole set and should be stated with the vendor lists as evidence.
- Because Oura also withholds RHR, an Apple-first app reading HealthKit sees *less* from a ring user than the notes implied.

### Gaps
- Whether Oura's API (as opposed to HealthKit) exposes HRV/readiness is a separate question; the notes correctly avoid claiming it doesn't.

---

## Claim 13 — WHOOP Apple Health exports

### Takeaway
**CONFIRMED** — WHOOP writes workouts, active energy, heart rate (activities and sleep only), sleep, resting HR, respiratory rate, SpO2 and optional steps; it does **not** write HRV, Recovery, Strain or all-day heart rate. Caveat on evidence class: WHOOP's own support page returned HTTP 403 on every attempt here, so this rests on multiple independent secondary sources that quote WHOOP's own statement, plus the consistent RMSSD-vs-SDNN explanation. That is strong but is *not* a primary retrieval.

**Safest wording:** "WHOOP does not export HRV, Recovery or Strain to Apple Health; WHOOP's stated reason is that it computes HRV as RMSSD while Apple Health stores SDNN. What does cross is sleep, workouts, activity heart rate, resting heart rate, respiratory rate, SpO2, active energy and optional steps."

### Cited Findings
- "WHOOP's page groups Resting Heart Rate, SpO2, and Respiratory Rate under the heading 'Recovery Metrics'… WHOOP states outright that it 'does not export HRV data to Apple Health at this time'" — [Sensai](https://www.sensai.fit/blog/wearable-apple-health-integration-what-syncs-oura-whoop-garmin), accessed 1 Nov 2026 *(secondary)*.
- Table of what syncs, including "Recovery score: No / Strain score: No / HRV: No / All-day heart rate: No", with the SDNN/RMSSD rationale — [Constant, 8 Jul 2026](https://trainconstant.com/blog/whoop-apple-health) *(secondary)*.
- Same conclusion, plus "WHOOP's help center states it does not export HRV" — [P.R.O. guide, checked 27 Oct 2026](https://proapp.uk/whoop-apple-health) *(secondary)*; [Horavi](https://horavi.app/compare/whoop) *(secondary)*.
- Historic data-quality caveat already in the notes (DC Rainmaker 2022: one HR value per day) — not re-verified.

### Inferences
- The notes' decision to label this `[SECONDARY]` and flag the missing primary was correct and should be preserved in the report's evidence grading. Three independent sources agreeing on a vendor's own quoted sentence is adequate for a market report, provided the report says "WHOOP states" rather than "we confirmed from WHOOP's documentation".
- The point that matters competitively is not HRV alone: **no proprietary score crosses**. Oura, WHOOP and Garmin all withhold readiness/recovery/body-battery. That is a stronger and better-evidenced statement than "no HRV".

### Gaps
- WHOOP's own support article could not be retrieved (403). If the final report needs a primary citation, it needs a browser session, not an automated fetch.

---

## Claim 14 — WHOOP clinician consults

### Takeaway
**PARTLY CONFIRMED.** The announcement is real (8 May 2026), the scope is real (US, video, licensed clinicians, EHR via HealthEx), and it is a **paid add-on**, not a membership inclusion. What is not verified is that it *launched* by 1 November 2026 — every source describes "this summer" as a plan, and none confirms general availability.

**Safest wording:** "WHOOP announced (8 May 2026) on-demand video consultations with licensed clinicians for US members, launching 'this summer' as a paid add-on, plus EHR import via HealthEx. This would make WHOOP the only product in the set pairing AI coaching with in-app human clinicians."

### Cited Findings
- "live, on-demand video consultations with a licensed clinician. Launching in the United States this summer…"; EHR syncing "in partnership with HealthEx" — [WHOOP press release, 8 May 2026](https://www.whoop.com/us/en/press-center/whoop-expands-health-platform-with-on-demand-clinician-access-and-new-ai-features/) (mirrored on [BusinessWire](https://www.businesswire.com/news/home/20260508464188/en/WHOOP-Expands-Health-Platform-with-On-Demand-Clinician-Access-and-New-AI-Features)).
- "a new paid add-on service is coming that will enable live, on-demand video consultations with a licensed clinician right inside the WHOOP app… More details and pricing at launch" — [WHOOP, "Inside Look: What's Next for WHOOP — Spring 2026", 8 May 2026](https://www.whoop.com/us/en/thelocker/2026-whats-next/).
- "Many of the new features are included in the price of membership, though live video consultation for U.S. users will come at an additional cost. Pricing and details will be available when that option launches this summer" — [CNBC, 8 May 2026](https://www.cnbc.com/2026/05/08/whoop-on-demand-clinician-access.html).

### Inferences
- The notes' inference that this is "a defensible moat against commodity AI coach positioning" is reasonable, but it should be phrased as an announced differentiator, not a shipped one, until a launch confirmation exists.
- The notes say clinician consults are "add-ons/tiers" in the pricing table — correct, and worth keeping because it changes the "WHOOP is expensive but all-in" impression.

### Gaps
- No evidence of launch, pricing, or availability as of 1 Nov 2026.
- Whether consultations include prescribing is explicitly undecided as of May ("details on prescribing… aren't available at this time" — CNBC).

---

## Claim 15 — Apple Readiness App Store rating

### Takeaway
**CONFIRMED as a fact, PARTLY as an interpretation.** The listing exists, is Apple's, is Watch-only and free, and shows **2.1 out of 5 from 60 ratings**. The claim that reviews are "dominated by complaints that Series 9–11 and Ultra 2 users cannot access it" was not verified — I did not open the review corpus.

**Safest wording:** "Apple publishes Readiness as a standalone Watch-only App Store app, rated 2.1/5 across 60 ratings — the lowest-rated Apple health app in this set, and a visible signal of frustration with the hardware lock."

### Cited Findings
- Listing: "Readiness… Only for Watch… Free"; "2.1 out of 5 — 60 Ratings"; requires iOS 27.0 or later; 1.3 MB; "Copyright © 2026 Apple Inc." — [App Store, Readiness, id6764448634](https://apps.apple.com/us/app/readiness/id6764448634), accessed 1 Nov 2026.
- Hardware lock is independently documented (see Claim 1) — [Apple Watch User Guide](https://support.apple.com/guide/watch/readiness-flx4gnzby346/watchos).

### Inferences
- 60 ratings is a small sample and a self-selected one; it is a *signal*, not a survey. The report should avoid "users are refusing" language and say "a small but visible cluster of negative reviews".
- If the report wants the "unmet demand on older hardware" argument, the safe version is: "Readiness is restricted to two models; owners of earlier watches have no first-party equivalent, which is the installed base Athlytic and Gentler Streak serve."

### Gaps
- Review content not audited.

---

## Claim 16 — Apple sensing frequency

### Takeaway
**CONFIRMED**, with one wording trap. HR is every 5 seconds all day (Apple claims 60× more frequent background HR than Series 11); HRV is measured "as often as every five minutes" (24× more frequent than Series 11). The notes apply the 24× figure to HRV, which is correct; a careless rewrite that applies 60× to HRV would be wrong.

**Safest wording:** "Series 12 / Ultra 4 measure background heart rate every five seconds all day (60× more often than Series 11) and HRV as often as every five minutes (24× more often), splitting HRV into Recovery HRV and overall HRV."

### Cited Findings
- "measures HRV as often as every five minutes and takes background heart rate readings every five seconds"; "60x more frequent background heart rate readings than Series 11"; "24x more frequent HRV readings than Series 11" — [Apple, Apple Watch Series 12](https://www.apple.com/apple-watch-series-12/), accessed 1 Nov 2026.
- "HRV… is now measured up to 24 times more often… two separate variants of HRV… Recovery HRV… overall HRV" — [Apple Newsroom, 9 Sep 2026](https://www.apple.com/newsroom/2026/09/introducing-apple-watch-series-12-with-the-all-new-health-sensing-system/).
- "Apple Watch Series 12 and Apple Watch Ultra 4 use green LEDs continuously during the day to provide a measurement as often as every five seconds" — [Apple Support 120277, 14 Sep 2026](https://support.apple.com/en-us/120277).

### Inferences
- The notes' link between higher-frequency HRV and Apple's ability to ship a same-day, updating readiness score is well supported: Apple's own framing is that daytime HRV is what lets it "spot shifts… before they show up in your overnight metrics".

### Gaps
- Apple does not publish the sampling rate on previous models, so the "60×" apples-to-apples claim is Apple's own.

---

## Claim 17 — NUTRITION 2026 photo-app accuracy abstract

### Takeaway
**CONFIRMED**, and the notes under-sold its provenance: it is an American Society for Nutrition press release plus independent trade coverage, not just a PDF. But the caveat must travel with it — it is a **conference abstract, not peer reviewed**, four apps, one controlled feeding study.

**Safest wording:** "In a NUTRITION 2026 abstract (NIH/NIDDK; 102 metabolic-kitchen meals averaging 918 kcal), four photo-based apps — MyFitnessPal, Lose It!, Cal AI and Appediet — underestimated meal energy by roughly 250–345 kcal and fat by about 30 g, i.e. about one-third of a ~900 kcal meal. The authors note abstracts are not peer reviewed."

### Cited Findings
- "four photo-based apps underestimated the calories and fat content of meals by about a third"; "102 meals"; "MyFitnessPal, LoseIt!, CalAI and Appediet"; "about 250 to 345 calories, on average, and fat by about 30 grams"; "higher-calorie meals more accurately than lower-calorie meals"; "carbohydrates more consistently"; keto meals worse; conference-abstract caveat stated by the publisher — [EurekAlert / American Society for Nutrition, 25 Jul 2026](https://www.eurekalert.org/news-releases/1136415).
- Independent trade summary adding the meal-size figure: "Meals averaged 918 calories, ranging from 592 to 1,211"; also "my two apps underestimated carbs by ~14 g" detail — [Medscape, 5 Aug 2026](https://www.medscape.com/viewarticle/photo-based-meal-apps-underestimate-calories-and-fat-2026a1000qo9); [Epocrates](https://www.epocrates.com/online/article/ai-calorie-counting-apps-miss-a-third-of-meal-calories).
- Publisher's own peer-review caveat: "abstracts presented at NUTRITION 2026… have not generally undergone the same peer review process required for publication in a scientific journal" — EurekAlert, same release.

### Inferences
- The notes' inference "photo AI systematically undercounts by ~30%" is directionally right but should be tied to *meal size*: the absolute error is large partly because these were ~918 kcal meals. A 300 kcal snack will not be off by 300 kcal. State it as "roughly a third of energy on ~900 kcal meals".
- This is the only independent accuracy evidence in the nutrition notes that survives scrutiny, and the notes were right to exclude the SEO "benchmark" tables.

### Gaps
- The journal-hosted abstract (cdn.nutrition.org) returned 403; the numbers above come from the society's press release and trade coverage, which agree with each other and with the notes.

---

## Claim 18 — JAMA AI-vs-human DPP trial

### Takeaway
**CONFIRMED as a real, correctly identified paper.** The DOI resolves to Mathioudakis et al., "An AI-Powered Lifestyle Intervention vs Human Coaching in the Diabetes Prevention Program," *JAMA* 334(23):2079, 2025. The specific numbers in the notes (n=368; 31.7% vs 31.9%; risk difference −0.2%, 1-sided 95% CI −8.2%) could not be re-read because JAMA returned 403.

**Safest wording:** "A pragmatic non-inferiority RCT in JAMA (2025) found a fully automated AI-led Diabetes Prevention Program non-inferior to human coaching at 12 months; the AI was 'a reinforcement learning algorithm that did not use large language models,' personalising prompt content and timing rather than clinical reasoning."

### Cited Findings
- Citation resolves: Mathioudakis N, Lalani B, Abusamaan MS, et al. *JAMA*. 2025;334(23):2079. doi:10.1001/jama.2025.19563 — [doi.org](https://doi.org/10.1001/jama.2025.19563), resolved 1 Nov 2026.
- Full text and abstract blocked (HTTP 403) at [JAMA](https://jamanetwork.com/journals/jama/fullarticle/2840703), 1 Nov 2026.

### Inferences
- The paper is real and the notes' use of it is the correct use: it supports *engagement/delivery* personalisation, not LLM clinical reasoning. Keep that inference; it is the single most useful evidence-based caution in the stack notes.
- Because the effect sizes were not re-verified, the report should quote the design and conclusion, and attribute exact percentages to the paper rather than presenting them as independently checked.

### Gaps
- n, arm sizes, and confidence intervals unverified in this pass.

---

## Cross-cutting problems in the notes

### Takeaway
Four issues affect more than one file and should be fixed before drafting.

**1. Two-way HealthKit claim is internally inconsistent.** `health_wearable_apps.md` Q3 takeaway says "only Oura and Gentler Streak are genuinely two-way", but the same section documents Google Health becoming two-way in August 2026. Correct list: **Oura, Gentler Streak, Google Health** are two-way; WHOOP is write-mostly; Athlytic is read-only; Garmin is write-only to Health.

**2. "Strength apps push workout summaries (not sets/reps)" is over-broad.** True of Strong/Hevy/Fitbod/JEFIT/Alpha Progression. Not true of WHOOP, which writes set-level detail as Health workout events. The report should say "third-party strength loggers" or "consumer lifting apps", not "strength apps".

**3. Apple redesign tense.** Every present-tense description of Insights/For You/Longevity/Health Age in `health_wearable_apps.md` must become "announced, in beta". `stacks_and_evidence.md` has it right. This is the one error most likely to embarrass the report, because it is checkable in one search.

**4. The "$79.99 vs $99" Google price split** must be reconciled to **$99/yr**.

### Cited Findings
- Two-way Google sync — [Google 5.05 release notes](https://support.google.com/googlehealth/thread/456993110/google-health-app-5-05-update-aug-2026?hl=en); Oura two-way — [Oura Support](https://support.ouraring.com/hc/en-us/articles/360025438734-Apple-Health-Integration); WHOOP strength set export — the notes' own WHOOP Community citation (not re-verified here).
- Google price — [Google blog, 7 May 2026](https://blog.google/products-and-platforms/products/google-health/google-health-coach/).

### Inferences
- The notes' evidence-labelling discipline (`[VERIFIED]` / `[SECONDARY]`) is good but applied inconsistently: several `[VERIFIED]` rows in `stacks_and_evidence.md` rest on secondary blogs (WHOOP, Garmin, Hevy set-level data). Downgrade those to `[SECONDARY]`.

### Gaps
- No source resolves whether Apple's Readiness score is exposed via HealthKit (still the single most important unknown for Motive's product thesis).

---

## Claims and citations to omit or downgrade

### Takeaway
These should not appear in the final report as stated. Either the substance is wrong, the source is not citable, or the precision exceeds the evidence.

**Omit entirely**
- **"Apple Health+ subscription"** as an existing or announced product (Claim 3). It does not exist; the only accurate version is the shelved-plan story.
- **Apple's "expanded access… for a fee" footnote as a health-monetisation signal.** It concerns server-side Apple Intelligence features (Siri AI, Live Rewind), not health.
- **"Google locked to 18+ at launch"** unless re-verified (Google says "eligible Fitbit and Pixel Watch users").
- **"Readiness reviews are dominated by Series 9–11 complaints."** Rating is real; the review-content claim is not verified.
- **"WHOOP clinician consults launched summer 2026."** Announced for summer 2026; launch unconfirmed.

**Downgrade / re-source**

| Notes' source | Problem | Replace with |
|---|---|---|
| TechRepublic (4 Aug 2026) for the Fitbit→Google Health rename | Passing mention in an Apple-sync story | [Google Health Help 17068213](https://support.google.com/googlehealth/answer/17068213) |
| MacRumors/TechRepublic for Google HRV exclusion | Presents a vendor-documented fact as user rumour | [Google Health Help 17037331](https://support.google.com/googlehealth/answer/17037331) data-type table |
| Samsung Magazine "Garmin Active Intelligence test" (11 Aug 2026) | Samsung fan site reviewing a Garmin feature; not an independent test lab | Drop the 15-minute refresh and home-screen-only details, or attribute as "one hands-on review" |
| Sensai (`sensai.fit`) for readiness-score incomparability and HRV gaps | Marketing/SEO blog; useful corroboration, not a citable authority | Use vendor export lists (Oura, Google) plus Apple/WHOOP docs; keep the argument, drop the citation |
| AgentMetrics (WHOOP nutrition) | Commercial SEO site | WHOOP's own AI article + WHOOP Community thread (already cited) |
| Nutrola (WHOOP pricing) | Commercial SEO site; the notes already flag it | Say "WHOOP does not publish tier pricing on a fetchable page; third-party figures are unreliable" |
| Calsa (Apple Health nutrition data types) | App-marketing blog | Apple Support 104997 + Apple Health page |
| Marrow (Hevy set-level / API) | App-marketing site | Hevy's own help centre, or state as unverified |
| Ultrafit360 / Horavi / P.R.O. / Titan for WHOOP export list | All commercial | Keep as `[SECONDARY]` corroboration only, and say "WHOOP states" |
| MacObserver "four verdicts… no published thresholds" (12 Sep 2026) | Specific URL not confirmed in this pass | The claim is supportable from Apple's own support page (inputs listed, no weights/accuracy); cite Apple directly |

### Cited Findings
- Google's HRV write-list omission is visible directly in the vendor table — [Google Health Help 17037331](https://support.google.com/googlehealth/answer/17037331).
- Apple's footnote context (server-side Apple Intelligence, daily limits) — [Apple Watch Series 12 footnotes](https://www.apple.com/apple-watch-series-12/).
- Google's launch scoping language — [Google blog, 7 May 2026](https://blog.google/products-and-platforms/products/google-health/google-health-coach/).

### Inferences
- The notes already excluded two suspected-synthetic sources in `stacks_and_evidence.md` (a "Dietary Assessment Initiative" meta-analysis and a "Welling" RCT). That instinct was right and should be extended to the SEO-tier vendor blogs above: they are not fabrications, but several are competitor-marketing content and should never carry a factual claim alone.
- The `health_wearable_apps.md` claim that Apple publishes "no input weighting, no thresholds beyond the four bands, and no accuracy figure" is *correct on the merits* but currently rests on a secondary article whose URL I could not confirm. Re-anchor it to Apple's support page, which lists inputs and bands and shows no weights or accuracy data.

### Gaps
- No authoritative source found for Garmin's HealthKit status beyond absence-of-evidence; the notes' "unknown, not no" framing should be preserved verbatim.
- No primary WHOOP support page retrievable by automated fetch (403) — a browser check is needed if the report wants a first-party citation.

---

## Access log

All pages opened 1 November 2026. Key primaries: Apple Newsroom (9 Sep 2026), Apple Support 128112 and the Watch Readiness guide, Apple Watch Series 12 product page, App Store id6764448634, Google blog (7 May 2026 ×2), Google Health Help 17068213 / 17037331 / 14236710, Google Health 5.05 release notes, Oura Support Apple Health, MacroFactor Workouts product + pricing + v1.0.1 notes, Carbon Release 77 + Smart Logger help, TechCrunch Cal AI (2 Mar 2026), EurekAlert NUTRITION 2026, WHOOP press release (BusinessWire mirror) + CNBC.

Blocked: whoop.com support (403), jamanetwork.com (403), cdn.nutrition.org (403), store.google.com pricing (region redirect).
