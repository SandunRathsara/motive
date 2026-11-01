# Adaptive Nutrition & Low-Friction Food Logging Apps — Competitive Research Notes

**Scope:** MacroFactor, Carbon Diet Coach, MyFitnessPal, Lose It!, Cronometer, Cal AI, SnapCalorie, Foodvisor.
**Window:** current state as of **1 November 2026**. **All URLs below were accessed 1 Nov 2026** unless a different date is stated inline.
**Reading conventions:** [claim] = first-party marketing claim, not independently verified. [third-party] = non-first-party source. [unclear] = contradictory or undocumented. Feature absence is only asserted where the vendor's own documentation enumerates features and omits it; those are labelled *documented-absence*.

---

## Per-App Capability Matrix

### Takeaway
Only three of the eight (MacroFactor, Carbon, MyFitnessPal) have genuinely mature low-friction entry *plus* an adaptive engine, and only MacroFactor and Carbon adapt targets from weight + intake data without human involvement. Photo-AI-first apps (Cal AI, SnapCalorie, Foodvisor, Lose It!) are fast but static: they set a target once and leave it. Cronometer has the deepest data model and an AI assistant but deliberately does **not** let that assistant change targets.

### Cited Findings — entry modes

| App | Barcode | Photo AI | Voice / natural language | Saved meals/recipes | Manual cal/macro | Notes |
|---|---|---|---|---|---|---|
| **MacroFactor** | Yes + nutrition-label scan ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) | Yes — photo, and "Photo & Text" ([MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/)) | Yes — AI logging "using voice or text" ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) | Yes — custom foods, recipes, recipe explode, copy/paste, favorites ([same](https://macrofactor.com/macrofactor-vs-cal-ai/)) | Yes — quick-add, 7 logging workflows ([MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/)) | AI breaks meals into editable ingredient entries grounded in its food DB, not a single opaque estimate ([MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/)) |
| **Carbon** | Yes + label scanner ([Help: add food](https://help.joincarbon.com/en/articles/9222815-how-to-add-food); [Label Scanner](https://help.joincarbon.com/en/articles/9573869-using-the-label-scanner)) | Yes — "Smart Logger" launched Jul 2026 ([Help: Smart Logger](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger)) | Yes — "Describe" tab accepts text or keyboard dictation, not a dedicated voice pipeline ([same](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger)) | Yes — copy meals, favorites, custom foods/recipes ([Play listing](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition)) | Yes — quick add macros ([same](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition)) | Smart Logger is explicitly a *draft*; nothing saves without confirmation ([Help](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger)) |
| **MyFitnessPal** | Yes — Premium ([Premium features](https://support.myfitnesspal.com/hc/en-us/articles/360032625951-MyFitnessPal-Premium-features)) | Yes — Meal Scan, Premium, English only, iOS 18/Android 13+; photo upload US-iOS only ([Meal Scan help](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner); [Winter Release 2026](https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/)) | Yes — Voice Log, Premium, English, v24.35+ ([Voice Log help](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice)) | Yes — My Foods/My Recipes/My Meals (but voice cannot log these) ([same](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice)) | Yes — Quick Add + macros ([Premium features](https://support.myfitnesspal.com/hc/en-us/articles/360032625951-MyFitnessPal-Premium-features)) | Voice Log cannot log saved items, Quick Add, weight, exercise or water ([help](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice)) |
| **Lose It!** | Yes — Scan It, Premium, English only ([Logging help](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It)) | Yes — Snap It, Premium, English only, photo or camera-roll upload ([Snap It help](https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It)) | Yes — Say It / "AI Voice" ([Logging help](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It)) | Yes — My Foods, Meals, Recipes tabs ([same](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It)) | Yes ([same](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It)) | Snap It returns database matches with estimated serving size; user can Swap/Edit ([Snap It help](https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It)) |
| **Cronometer** | Yes — free ([Track Food](https://cronometer.com/features/track-food.html)) | Yes — Photo Log, Gold ([Gold](https://cronometer.com/gold/)) | Yes — Voice Log + hands-free Siri, Gold ([Voice Logging help](https://support.cronometer.com/hc/en-us/articles/47549391461780-Mobile-Voice-Logging); [Siri help](https://support.cronometer.com/hc/en-us/articles/47664884315412-Mobile-Siri-Voice-Logging)) | Yes — custom meals/recipes, Recipe Importer, Repeat Items ([Gold](https://cronometer.com/gold/)) | Yes ([Track Food](https://cronometer.com/features/track-food.html)) | 1.1M verified foods, 95 nutrients ([App Store](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738)) |
| **Cal AI** | Yes ([calai.app](https://www.calai.app/)) | Yes — core product; uses phone depth sensor for volume ([calai.app](https://www.calai.app/)) | Yes — "describe your meal"; voice listed by reviewers ([calai.app](https://www.calai.app/); [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) | Yes — own foods and recipes ([calai.app](https://www.calai.app/)) | Yes — manual adjust all macros ([App Store review text](https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616)) | Nutrition DB is MyFitnessPal's since Dec 2025 ([TechCrunch](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/)) |
| **SnapCalorie** | Yes, secondary ("some products… varied calorie counts by region") ([App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)) | Yes — plus LiDAR depth on iPhone Pro ([App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)) | Yes — dictate voice notes; "dictating gram values… NO TYPING" ([App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)) | [unclear] — no saved-meal/recipe feature documented on the pages reviewed | Yes — edit predictions ([App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)) | Nutrition label photo autofill ([FAQ](https://www.snapcalorie.com/faq.html)) |
| **Foodvisor** | Yes ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Yes — flagship ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Yes — "Speak directly to the app" ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Yes — save foods, recipes, meals as favourites ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Yes ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Photo analysis is Premium-gated ([premium page](https://www.foodvisor.io/en/premium/presentation)) |

### Cited Findings — adaptation, platform, coaching, price

| App | Adapts targets? | Mechanism / check-in | Apple Health | Apple Watch | Coaching type | Price (US, as documented) |
|---|---|---|---|---|---|---|
| **MacroFactor** | **Yes**, weekly, automatic-on-approval | Expenditure estimated from logged intake + trend weight; weekly check-in recommends calorie/macro changes; "adherence-neutral"; smoothing layer to avoid over-correction ([algorithm](https://macrofactor.com/algorithm-accuracy/); [check-in help](https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal)) | Two-way: imports weight/nutrition/steps; exports nutrition out; 30-day backfill; strict source priority ([Integrations](https://help.macrofactorapp.com/en/articles/102-integrations)) | Watch app ✓ (vendor comparison table) ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) | **Deterministic algorithm** + templated "Coaching Modules", not generative chat ([MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/); [Sept 2024 update](https://macrofactor.com/mm-september-2024/)) | $11.99/mo; $71.99/yr (~$5.99/mo); 7-day trial ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) |
| **Carbon** | **Yes**, weekly, mandatory-ish check-in | Check-in asks (1) compliance, (2) weight (+optional body fat, menstrual flag), (3) "does data look right"; calories move up/down/hold ([coaching system](https://help.joincarbon.com/en/articles/5296570-what-is-carbon-and-how-does-the-coaching-system-work)); "Coach Trend Weight" experimental ([help](https://help.joincarbon.com/en/articles/6078877-coach-trend-weight)) | Reads Body Weight + Body Fat; smart-scale import ([App Store](https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611); [site](https://www.joincarbon.com/how-it-works)) | Not documented (*documented-absence*) | **Rule-based coach**, authored by Layne Norton PhD + RD Keith Kraker; no AI chat documented ([Play listing](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition)) | $11.99/mo; $59.99/6-mo; $99.99/yr ([pricing](https://www.joincarbon.com/pricing)) |
| **MyFitnessPal** | **No** adaptive TDEE; only exercise/step "Calorie Adjustment" raises the day's goal | Static goal from profile + activity; steps from Apple Health raise calories ([step tracking help](https://support.myfitnesspal.com/hc/en-us/articles/360032273612-How-step-tracking-works-in-MyFitnessPal)) | Most complete doc set: food→AH, exercise←AH, weight both ways, sleep←AH; no historical backfill; no caffeine/Vit A ([Apple Health help](https://support.myfitnesspal.com/hc/en-us/articles/360032271092-Apple-Health-connection-and-syncing)) | Yes — log food/water/quick-add, 4 complications, steps adjust calorie goal; active calories NOT separately counted ([Watch help](https://support.myfitnesspal.com/hc/en-us/articles/360032625731-Apple-Watch-App)) | **Logging + insights**; AI is perception-only (Meal Scan, Voice Log) ([Premium features](https://support.myfitnesspal.com/hc/en-us/articles/360032625951-MyFitnessPal-Premium-features)) | Premium $79.99/yr; Premium+ $99.99/yr, billed annually ([premium page](https://frontend.myfitnesspal.com/premium)) |
| **Lose It!** | [unclear] — no adaptive engine documented; budget is "personalized" at setup ([Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit)) | Static budget + exercise; GLP-1 medication tracker added ([same](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit)) | Yes — Apple Health sync ([Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit)) | Tracker sync listed under Premium ([same](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit)) | **Logging + insights** ("Patterns" insights engine); no AI coach documented | Basic free; Premium $79.99/yr; Lifetime $299.99 ($229.99 for active Premium) ([tiers help](https://loseit.zendesk.com/hc/en-us/articles/51906561286804-Lose-It-Membership-Tiers-Pricing)) |
| **Cronometer** | **No** auto-adaptation; user-set targets, Macro Scheduler, "body-aware safety guardrails" added to weight-goal setup Apr 2026 ([App Store release notes](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738)) | Targets are user-configured; Crono Coach advises but "will not automatically change your diary, targets, settings" ([blog](https://cronometer.com/blog/crono-coach/)) | Explicit: "Sync with Apple Health and Apple Watch"; imports workouts, activity, energy expenditure, sleep ([App Store](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738)) | Yes — Apple Watch support in 4.56.0 release notes ([App Store](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738)) | **AI assistant** (Crono Coach, Gold) — advisory only, LLM-backed ([help](https://support.cronometer.com/hc/en-us/articles/49995994334100-Mobile-Crono-Coach); [Cronometer staff on r/cronometer](https://www.reddit.com/r/cronometer/comments/1u82jvf/crono_coach_data_sharingprivacy/)) | Basic free; Gold $4.99/mo billed annually ($59.99/yr) or $10.99/mo ([Gold](https://cronometer.com/gold/)) |
| **Cal AI** | **No** — targets static from onboarding quiz; expenditure graph reflects Apple Health activity only ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/), competitor testing) | Questionnaire → calorie target; exercise can add calories same-day ([calai.app](https://www.calai.app/)) | Used for activity calories; Watch app ✓ per vendor comparison ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) | Watch app ✓ (same, competitor table) | **Logging + gamification** (badges, streaks, communities); no coach documented | ~$9.99/mo; $30/yr; family $59.99/yr — per Cal AI support email quoted by MacroFactor [third-party] ([MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/)) |
| **SnapCalorie** | [unclear] — "set targets" at onboarding; no adaptation documented ([FAQ](https://www.snapcalorie.com/faq.html)) | Goal questionnaire → targets; active calories from Apple Health offset intake ([FAQ](https://www.snapcalorie.com/faq.html)) | Push nutrition out to HealthKit; pull active calories, workouts, steps in ([App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307); [FAQ](https://www.snapcalorie.com/faq.html)) | Not documented | **Logging + optional human expert review** of photos (2023) ([TechCrunch](https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/)); a ChatGPT meal-suggestion chatbot existed in 2023 — current status [unclear] ([same](https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/)) | "Free forever" core + IAP; actual IAP prices **not published** ([home](https://www.snapcalorie.com/); [App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)) |
| **Foodvisor** | **No** — targets set at onboarding and not recalculated ([2023 hands-on](https://feastgood.com/foodvisor-review/); corroborated by users Aug 2026 on [r/Foodvisor](https://www.reddit.com/r/Foodvisor/comments/1vzlnmb/does_foodvisor_automatically_recalculate_calorie/)) | Questionnaire → plan; dietitian can advise changes manually ([premium page](https://www.foodvisor.io/en/premium/presentation)) | "Apple Health sync" ([App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872)) | Not documented | **Human RD chat** [claim] ([premium page](https://www.foodvisor.io/en/premium/presentation); corroborated 2023 [FeastGood](https://feastgood.com/foodvisor-review/)) — but a 2026 competitor review says chat was removed [conflicting] ([NutriScan](https://nutriscan.app/blog/posts/foodvisor-worth-it-2026-review-73e3363135)) | No fixed public price; US App Store rows $14.99–$89.99; observed $14.99/mo, $83.99/yr [third-party] ([help](https://foodvisor.zendesk.com/hc/en-us/articles/26650824663580-How-much-does-the-Foodvisor-subscription-cost); [Shelog](https://www.shelog.ai/blog/foodvisor-review-2026)) |

### Inferences
- The category has split into two product philosophies: **adaptive engine + precise logging** (MacroFactor, Carbon) vs **frictionless capture + static plan** (Cal AI, SnapCalorie, Foodvisor, Lose It!). Motive's stated thesis — minimal input *plus* adaptation — is currently occupied only by Carbon (which lacks Apple Watch/workout depth) and MacroFactor (which is deliberately not a coaching chatbot and ships workouts as a *separate* app).
- Nobody in this set combines, in one app: photo/voice capture, adaptive targets, workout logging, and a conversational coach. That is the open lane.
- Pricing has converged to ~$72–$100/yr for premium nutrition, with Cronometer the value outlier at $59.99/yr and MyFitnessPal/Foodvisor the high end.

### Gaps
- No vendor publishes churn, retention, or outcome data. All efficacy statements are self-reported.
- Apple Watch app existence for Carbon, SnapCalorie, Foodvisor could not be confirmed either way from first-party docs.
- SnapCalorie and Cal AI IAP price ladders are not published on their own sites.

---

## Which food entry modes are actually supported now

### Takeaway
Every app in the set now has photo AI except none — all eight do — but the *quality of the fallback* differs sharply. The real differentiator is whether photo output lands as editable, database-grounded line items (MacroFactor, Carbon, Cronometer, Lose It!) or as an opaque estimate the user must repair (Cal AI).

### Cited Findings
- MacroFactor's AI returns "nutrient complete, editable food entries" broken into individual ingredients, and will only generate a synthetic entry "when it is necessary or otherwise optimal" — otherwise it queries real foods — [MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/). Photo, and "Photo & Text" combined mode — [same](https://macrofactorapp.com/macrofactor-ai/).
- MacroFactor positions itself against "LLM-based food loggers" that "almost universally lack the depth and functionality necessary to be complete solutions" — [MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/).
- Carbon's Smart Logger "turns a meal photo or a quick description into a draft diary entry, then matches those foods to Carbon's verified nutrition database"; photo and description analysis both run in the cloud and require connectivity — [Carbon help](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger).
- Carbon explicitly recommends *not* using photos for "complex mixed dishes like casseroles, stir-fries, or soups" and using Describe instead — a rare, candid limitation — [Carbon help](https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger).
- MyFitnessPal Voice Log is Premium, English-only, iOS/Android app v24.35.0+, requires network, and cannot log saved foods/recipes/meals, Quick Add, weight, exercise or water — [MFP help](https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice).
- MyFitnessPal Meal Scan is Premium, English, iOS 18/Android 13+, app v22.17+; "Meal Scan gives you a starting point, not a final answer"; photo upload (snap now, log later) is US-iOS only — [Meal Scan help](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner); [Winter Release 2026](https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/).
- Lose It! Snap It, Scan It and Say It are Premium and English-only; Snap It analyses a real-time or uploaded photo and "suggest[s] the best matches in our food database", with Swap and Edit serving controls — [Snap It help](https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It); [Logging help](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It).
- Cronometer's barcode scanner is free for all users; Photo Log and Voice Log are Gold; Voice Log also works hands-free through Siri shortcuts without opening the app — [Gold](https://cronometer.com/gold/); [Siri help](https://support.cronometer.com/hc/en-us/articles/47664884315412-Mobile-Siri-Voice-Logging).
- Cronometer Voice Logging returns matched database foods that must be reviewed, and can be converted directly into a Custom Meal or Recipe — [Voice Logging help](https://support.cronometer.com/hc/en-us/articles/47549391461780-Mobile-Voice-Logging).
- SnapCalorie's differentiator is hardware: LiDAR depth-sensor volume measurement on iPhone Pro, with reported error of ±80 kcal on a 500 kcal dish on iPhone Pro vs ±130 on a regular iPhone — [App Store listing](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307)[claim].
- SnapCalorie states its photo AI handles "any food on a relatively flat plate", and that "Drinks, packaged foods, and food in bowls is still a work in progress" (2023 page, still live) — [WhatIsSnapCalorie](https://app.snapcalorie.com/what-is-snapcalorie).
- Foodvisor: photo, speech, typed search, barcode, and saved favourites, with Apple Health sync — [App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872).
- Cal AI: photo (depth-sensor volume), barcode, "describe your meal", manual add, own foods and recipes — [calai.app](https://www.calai.app/).

### Inferences
- Photo AI is now table stakes; the defensible UX is *post-capture editability* and *database grounding*, which is exactly where MacroFactor and Carbon differentiate and where Cal AI is weakest.
- Voice/natural-language logging is consolidating into two forms: OS-level dictation/Siri (Cronometer, MFP voice pipeline) and "describe the meal" text boxes with optional keyboard dictation (Carbon, Cal AI, SnapCalorie). True conversational, multi-turn voice capture (correcting mid-sentence, asking follow-ups) is not documented anywhere in this set.

### Gaps
- No vendor documents accuracy of its own voice/natural-language parsing.
- No documented support for logging a meal by photographing a *restaurant menu* or a *grocery receipt* in any of the eight.

---

## Do they adapt calorie/macro targets, and do they need weight or adherence check-ins

### Takeaway
Adaptation is a two-vendor feature. MacroFactor adapts from a deterministic expenditure model and is explicitly "adherence-neutral"; Carbon adapts from a weekly check-in that *asks* about compliance. Everyone else sets a static target at onboarding, and the only "adaptation" is exercise-calorie pass-through.

### Cited Findings
- MacroFactor: "your estimated expenditure will adjust downward, and your energy intake targets will decrease… until your energy intake target does actually result in your desired rate of weight loss" — the algorithm treats intake + weight trend as a system of equations, correcting its own initial TDEE error — [algorithm accuracy](https://macrofactor.com/algorithm-accuracy/).
- MacroFactor's adjustment is "adherence-neutral": recommendations depend on *actual* intake and weight change, not on how well the user hit targets — [MacroFactor product page](https://macrofactor.com/macrofactor/).
- MacroFactor applies a deliberate damping layer so a 500 kcal apparent expenditure swing yields only a 200–300 kcal recommendation change, to avoid a "caloric roller coaster" — [check-in help](https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal).
- MacroFactor offers Coached / Collaborative / Manual program modes, plus "Dynamic Maintenance" which will run a small deficit or surplus to return the user to a target weight — [product page](https://macrofactor.com/macrofactor/); [goal features](https://macrofactor.com/goal-features/).
- MacroFactor states its recommendations are "nearly three times as accurate as nutrition recommendations coming from static TDEE formulas," with an error distribution table showing 19.2% of static-formula estimates off by 500–1000 kcal/day [claim, methodology not published on that page] — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).
- Carbon: at check-in the coach asks (1) were you compliant, (2) weight / optional body fat / menstrual flag, (3) "does the data you entered look right"; then "if you are not losing enough weight, you will receive a calorie decrease" — [Carbon coaching help](https://help.joincarbon.com/en/articles/5296570-what-is-carbon-and-how-does-the-coaching-system-work).
- Carbon acknowledges its own data dependency: "How accurately Carbon can make those adjustments depends on how consistently you hit your targets between check-ins. Weeks with inconsistent logging or compliance give the app less reliable data" — [Carbon macros help](https://help.joincarbon.com/en/articles/14005628-how-carbon-sets-and-adjusts-your-macros).
- Carbon caps protein within goal/preference-specific floors and ceilings, and redistributes carbs/fat on a slider without changing total calories — [same](https://help.joincarbon.com/en/articles/14005628-how-carbon-sets-and-adjusts-your-macros).
- Carbon's Coach Trend Weight is still flagged experimental and must be enabled in Settings → Experimental — [Carbon help](https://help.joincarbon.com/en/articles/6078877-coach-trend-weight).
- MyFitnessPal's only dynamic element is step/exercise-driven: "Connected step sources also generate a Calorie Adjustment, which raises your daily calorie goal on more active days" — [MFP step help](https://support.myfitnesspal.com/hc/en-us/articles/360032273612-How-step-tracking-works-in-MyFitnessPal).
- Cronometer added "body-aware safety guardrails to weight goal setup" (v4.54.0, Apr 2026) but documents user-set custom macro/micronutrient targets and a Macro Scheduler for per-weekday targets — i.e. configuration, not closed-loop adaptation — [App Store release notes](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738); [Gold](https://cronometer.com/gold/).
- Cronometer's Crono Coach "will not automatically change your diary, targets, settings, medications, or supplements. It provides guidance only" — [Cronometer blog](https://cronometer.com/blog/crono-coach/).
- Cal AI testing: "the baseline Calorie recommendation did not change despite the expenditure graphic showing updates"; targets "appear to be determined primarily from the questionnaire" [competitor-authored test] — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).
- Foodvisor: "Once I got my initial targets, that was pretty much it, no matter what happens to my body weight over time" [third-party hands-on] — [FeastGood](https://feastgood.com/foodvisor-review/); users in Aug 2026 report the same and manually lower their own target — [r/Foodvisor](https://www.reddit.com/r/Foodvisor/comments/1vzlnmb/does_foodvisor_automatically_recalculate_calorie/).
- Lose It! markets a "personalized daily calorie budget and weight loss schedule" with no published adjustment algorithm — [Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit).

### Inferences
- The presence of a *weekly check-in ritual* is not incidental; it is how Carbon manufactures the compliance signal its algorithm needs, and it doubles as retention. MacroFactor's adherence-neutral framing removes that friction but still surfaces a weekly check-in prompt.
- Motive's "minimal-input" bet only works if weight (or a proxy) is captured passively. MacroFactor already accepts scale weight from Apple Health with a documented priority order ([Integrations](https://help.macrofactorapp.com/en/articles/102-integrations)), which sets the bar: an adaptive engine that ingests Health weight without a manual ritual.

### Gaps
- No independent validation of any vendor's adaptation algorithm was found.
- Whether Lose It! silently recalculates budget on weight change is undocumented — a real gap for a "low-friction adaptation" comparison.

---

## Apple Health and Apple Watch integration (documented)

### Takeaway
MyFitnessPal has by far the most explicit, permission-level Apple Health documentation (including what does *not* sync). MacroFactor has the most sophisticated *data-priority* model. Cronometer documents the widest device import surface. Carbon documents only weight/body-fat import.

### Cited Findings
- MyFitnessPal: food → Apple Health (meal summaries and most nutrients; caffeine and Vitamin A excluded; no timestamps); exercise ← Apple Health (same-day only, no backfill); weight both directions; sleep ← Apple Health; no historical import — [MFP Apple Health help](https://support.myfitnesspal.com/hc/en-us/articles/360032271092-Apple-Health-connection-and-syncing).
- MyFitnessPal Apple Watch: view remaining calories/nutrients, add water, quick-add calories, steps + step goal, four complications (Calories, Carbs, Fat, Protein); "MyFitnessPal reads step data and Other workouts from Apple Health, but doesn't yet factor in active calories your watch measures separately" — [MFP Watch help](https://support.myfitnesspal.com/hc/en-us/articles/360032625731-Apple-Watch-App).
- MyFitnessPal maps 80+ Apple Watch workout types onto its own exercise database; unmapped types appear as "Apple Health App Workout" — [MFP help](https://support.myfitnesspal.com/hc/en-us/articles/47890508058125-Apple-Watch-workout-names-and-how-they-sync-to-MyFitnessPal).
- MacroFactor: primary integrations are Apple Health (iOS) and Health Connect (Android); separate toggles per data type; pulls up to 30 days of history then stays in sync; used both to import smart-scale weight and to export nutrition to third-party coaching apps; Fitbit integration deprecated — [MacroFactor Integrations](https://help.macrofactorapp.com/en/articles/102-integrations); [Connect Health/Apple Health](https://help.macrofactorapp.com/en/articles/65-connect-health-connect-or-apple-health).
- MacroFactor's priority order is fixed and non-editable: weight = manual > Apple Health/Health Connect > Fitbit; nutrition = manual > Food Log > Apple Health/Health Connect; step data = manual > Apple Health/Health Connect — [priority help](https://help.macrofactorapp.com/en/articles/56-weight-or-nutrition-source-priority).
- MacroFactor syncs *daily totals* from other apps, not individual foods, and lands them on the Nutrition page rather than the food timeline — [Where is my nutrition synced](https://help.macrofactorapp.com/en/articles/36-where-is-my-nutrition-synced).
- MacroFactor ships a Watch app (listed ✓ in its own competitor comparison table) — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/); MacroFactor's step data also feeds an optional "expenditure modifier" — [expenditure modifiers](https://macrofactor.com/expenditure-modifiers/).
- Carbon: "Integrates with Apple Health to automatically read Body Weight and Body Fat values"; marketing adds "Sync with Apple Health or Google Health Connect to instantly import smart scale data" — [App Store](https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611); [site](https://www.joincarbon.com/how-it-works).
- Cronometer: "Sync with Apple Health and Apple Watch", plus Fitbit, Garmin, Oura, Whoop, Dexcom; "Import workouts, activity, and energy expenditure… Import sleep data"; Apple Watch support added in app v4.56.0 — [App Store](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738).
- SnapCalorie: pushes meal nutrition into HealthKit; "You can integrate any fitness tracker with Apple Health and we will automatically pull active calories, workouts, and steps to offset your consumption calories"; Android integration "currently in development" — [FAQ](https://www.snapcalorie.com/faq.html); [App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307).
- Foodvisor: "Apple Health sync to bring all your health metrics together"; Apple Health pulls activities in automatically [third-party hands-on] — [App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872); [Garage Gym Reviews](https://www.garagegymreviews.com/foodvisor-review).
- Cal AI: expenditure graph "reflects activity-related Calories from Apple Health or logged exercise"; Watch app ✓ per competitor table — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).
- Lose It!: HealthKit listed among fitness syncs (Premium), plus Fitbit, Garmin, Withings, Google Fit — [Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit).

### Inferences
- The pattern across the market is **read weight + activity in, write nutrition out**. Nobody writes *targets* or *coaching decisions* to Health, and nobody ingests HRV, sleep stages, or training load into the calorie model except as crude active-energy offsets.
- MacroFactor's explicit source-priority model is a genuinely under-appreciated UX/trust feature: users can see exactly which data won. Motive should expect users to hit the same conflict (Watch weight vs smart scale vs manual).
- MyFitnessPal's "doesn't factor in active calories your watch measures separately" is an admission that even the market leader's Watch math is partial — a wedge for a Watch-native product.

### Gaps
- No vendor documents using Apple Watch *workout* data for anything other than calorie offset — e.g. no documented adjustment of protein targets on resistance-training days, despite MacroFactor's protein targets being exercise-type-dependent ([product page](https://macrofactor.com/macrofactor/)).
- HealthKit write scopes for Carbon, Cronometer and Lose It! (does nutrition flow *out*?) are undocumented.

---

## AI coaching vs rule-based algorithms vs logging-only

### Takeaway
Three distinct things are being sold as "AI": (1) perception (photo/voice parsing), (2) deterministic coaching math, (3) generative chat. Only Cronometer ships (3), only MacroFactor and Carbon ship (2), and everyone ships (1). No product in this set closes the loop from (3) to target changes.

### Cited Findings
- MacroFactor Workouts states its progression is "driven by rule-based logic, not generative AI… changes in weight and reps follow clear rules versus black-box guidance" — the clearest first-party statement of the rule-based position — [MacroFactor Workouts](https://macrofactor.com/workouts/).
- MacroFactor's AI interface has "no fluff, no performative chat interface – just streamlined results" — [MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/).
- MacroFactor's nutrition "coaching" is delivered as templated Coaching Modules curated weekly by "the MF Coach" that "observes your logging behaviors and analyzes your data and progress each week" — [Sept 2024 product update](https://macrofactor.com/mm-september-2024/).
- MacroFactor Workouts and Nutrition are separate apps: body metrics, scale weight, progress photos, habits and period tracking sync, but "at launch, there are no shared coaching features or automatic program adjustments between nutrition and training" — [Workouts FAQ](https://macrofactor.com/workouts/).
- Carbon markets itself as doing "everything a normal nutrition coach would but at a fraction of the cost," with check-in explanations and check-in history so "you're never left wondering why the app did or didn't make a change" — [Play listing](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition)[claim].
- Crono Coach "turns your nutrition data into clear, personalized guidance"; can review the daily summary, suggest a meal, audit settings for conflicts, and encourage; Gold-only, on web/iOS/Android — [Cronometer blog](https://cronometer.com/blog/crono-coach/).
- Cronometer staff confirm real LLM use: "we do use AI to analyze a snapshot of your Diary and Nutrition Report so it can surface patterns and suggestions," with provider agreements prohibiting training on user data — [r/cronometer, Jun 2026](https://www.reddit.com/r/cronometer/comments/1u82jvf/crono_coach_data_sharingprivacy/).
- Foodvisor sells human coaching: "Coaching by our dietitians", "Drop a message to our registered dietitians in the chat"; a 2023 hands-on confirms 1:1 chat with a named nutritionist replying within hours during business hours — [premium page](https://www.foodvisor.io/en/premium/presentation); [FeastGood](https://feastgood.com/foodvisor-review/).
- SnapCalorie (2023) had "a team of human reviewers for an added layer of quality" plus "a ChatGPT-powered chatbot" giving meal suggestions — current availability of either is undocumented — [TechCrunch](https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/).
- MyFitnessPal's AI surface is perception only (Meal Scan ML/CV "trained to recognize foods from millions of photos"), plus a Premium+ *meal planner* — no coaching agent is documented — [Meal Scan help](https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner); [premium page](https://frontend.myfitnesspal.com/premium).
- Lose It! branding is "AI VOICE & PHOTO MEAL LOGGING" — AI as capture, not coaching — [Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit).
- Cal AI's AI is the product surface (photo → estimate) plus gamification (badges, streaks, in-app communities); no coaching layer documented — [calai.app](https://www.calai.app/); [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).

### Inferences
- "AI coach" in this market is a spectrum nobody has completed. The credible, defensible architecture is the one MacroFactor articulates — deterministic math for the decision, AI only for capture and explanation. A generative coach that can *change targets* is unclaimed territory, and also the highest-risk (safety, liability, trust).
- Foodvisor is the only human-in-the-loop product; if it has genuinely removed RD chat (conflicting evidence), that leaves a vacuum for "AI + escalation to a human" positioning.
- MacroFactor splitting workouts into a second app is a structural weakness Motive can exploit: the market leader in adaptive nutrition has *no* shared coaching between training and nutrition, by explicit design.

### Gaps
- No vendor publishes an evaluation of its coaching outputs (hallucination rate, adherence lift, outcome delta).
- Whether Cal AI or SnapCalorie has shipped a chat assistant since 2023 is unresolved.

---

## UX strengths, limitations, pricing, and evidence gaps

### Takeaway
MacroFactor wins on logging speed and analytic depth but is deliberately narrow (no coach chat, workouts in a separate app, premium-only). Carbon wins on coach legibility but is check-in-gated and lighter on Apple/Watch surface. The photo-first apps win acquisition and lose trust on accuracy. Evidence for *outcomes* is essentially absent across the category.

### Cited Findings — UX and limitations
- MacroFactor publishes a "Food Logging Speed Index" and claims the lowest action counts: 10 actions to log from search vs 19 for Cal AI; 5 vs 10 for barcode; 3 vs 8 for quick-add [vendor-run benchmark] — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).
- MacroFactor database: ~1.36M verified search foods + ~4M barcode entries, plus ~26,500 NCC Food and Nutrient Database items; 54 trackable nutrient fields vs 14 in Cal AI [vendor comparison] — [MF vs Cal AI](https://macrofactor.com/macrofactor-vs-cal-ai/).
- MacroFactor has no client-management portal for coaches; users export spreadsheets or screenshots — [product page](https://macrofactor.com/macrofactor/).
- Carbon's check-in report is unusually legible: updated targets with net change, a plain-language reason for the adjustment, compliance vs prescribed intake, and goal progress — [Carbon help](https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in).
- Carbon offers a Calorie Planner to redistribute weekly calories, and will absorb an overage across the rest of the week — [Play listing](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition).
- Carbon's food database is powered by FatSecret — [Play listing](https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition).
- Carbon App Store: 4.8 from 8.1K ratings; requires iOS 16.6+; iPhone only (runs on Apple-silicon Mac) — [App Store](https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611).
- MyFitnessPal gates barcode, Meal Scan and Voice Log behind Premium, leaving the free tier without any scanner — [premium page](https://frontend.myfitnesspal.com/premium).
- MyFitnessPal Premium+ adds meal planner, 1,500+ recipes, grocery-app sync, automated meal-plan logging — [premium page](https://frontend.myfitnesspal.com/premium).
- Lose It! gates barcode scanning, Snap It, Say It, custom macro targets and meal planning behind Premium; Snap It/Scan It/Say It are English-only regardless of payment — [tiers help](https://loseit.zendesk.com/hc/en-us/articles/51906561286804-Lose-It-Membership-Tiers-Pricing); [Logging help](https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It).
- Lose It! added a GLP-1 tracker: log medication, "view estimated GLP-1 levels, and see how each phase may align with your hunger and eating habits" — [Play listing](https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit).
- Cronometer tracks up to 95 nutrients and compounds and staff-reviews submitted foods before adding them to the CRDB — [App Store](https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738); [4 ways to log](https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/).
- SnapCalorie App Store: 4.7 from 6.9K ratings; iOS 17.0+; English only; 195.8 MB; sold by Perception Labs — [App Store](https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307).
- Foodvisor App Store: 4.7 from ~99,800 ratings; "Editors' Choice"; 20+ languages [third-party] — [App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872); [Adapty paywall library](https://adapty.io/paywall-library/foodvisor/).
- Foodvisor paywall is genuinely opaque: help center says it "cannot provide a fixed universal price" because price varies by country, store and promotion — [Foodvisor help](https://foodvisor.zendesk.com/hc/en-us/articles/26650824663580-How-much-does-the-Foodvisor-subscription-cost).
- Foodvisor claim: "our users lose an average of 15.83 lb in 3 months" from an "internal study conducted on 4,419 users in January 2026 (average BMI: 34.72)" [claim; no control group or peer review] — [App Store](https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872).
- Foodvisor API marketing claims "95% precision" across 20,000 foods and a 10M-image training set; "accuracy" is not defined — [Foodvisor guide](https://www.foodvisor.io/en/guides/article/food-image-recognition-explained/)[claim].
- Cal AI's own FAQ says the app is "about 80% accurate" and does not define the metric; its blog claims 90% for visible foods — [calai.app](https://www.calai.app/); method not published [third-party analysis](https://truecal.com/how-accurate-is-cal-ai).
- Cal AI founders separately told press the app is "90% accurate" — [TechCrunch, Mar 2025](https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/).

### Cited Findings — industry structure and independent evidence
- MyFitnessPal acquired Cal AI; deal closed December 2025, announced 2 Mar 2026; Cal AI had >15M downloads and >$30M annual revenue; Cal AI kept as a separate app and integrated with MFP's database (20M foods, 68,500 brands, 380+ restaurant chains); CEO frames the split as "Cal AI is for those preferring speed over accuracy. MFP is for those who want the reverse" — [TechCrunch](https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/).
- Independent (conference abstract, NIH researchers, NUTRITION 2026): 102 weighed meals photographed and submitted to MyFitnessPal, Lose It!, Cal AI and one other app; **all** underestimated energy by 252–345 kcal per meal on average and fat by ~30 g; kcal LOA roughly −884 to +246; consistency (ICC) poor (<0.40) for most outcomes except carbohydrate — [Current Developments in Nutrition abstract](https://cdn.nutrition.org/article/S2475-2991(26)01103-0/fulltext).
- The same abstract reports mean meal energy 918 kcal (range 592–1211), so a ~330 kcal underestimate is roughly a one-third undercount — consistent with self-report dietary assessment error — [same](https://cdn.nutrition.org/article/S2475-2991(26)01103-0/fulltext).
- SnapCalorie's accuracy claims rest on its own Nutrition5k dataset (5,000 dishes, every ingredient weighed, robotic capture rig), published at CVPR 2021 — a dataset/benchmark paper, not an independent product trial — [SnapCalorie FAQ](https://www.snapcalorie.com/faq.html); [CVPR paper](https://openaccess.thecvf.com/content/CVPR2021/papers/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.pdf).
- SnapCalorie's own FAQ numbers: ~15% mean caloric error (±150 kcal on a 1,000 kcal dish), vs ~40% for dietitians estimating from a photo and ~53% for users of other apps [claim] — [SnapCalorie FAQ](https://www.snapcalorie.com/faq.html).

### Inferences
- The strongest, most citable accuracy finding in this whole space is the *negative* one: photo AI systematically undercounts by ~30%, which means any product selling photo-first logging as precise is over-claiming. Motive should design for "estimate + easy correction + algorithm that tolerates noise," which is exactly MacroFactor's stated stance ("Its algorithms can gracefully subsume food logging errors" — [MacroFactor AI](https://macrofactorapp.com/macrofactor-ai/)).
- Acquisition consolidation (MFP + Cal AI) means the two largest "speed" and "scale" brands now share a database and an owner — reducing database differentiation as a moat and shifting the fight to coaching and platform integration.
- Pricing is not a differentiator: $60–$100/yr is the band, and every app runs aggressive promotional paywalls (Foodvisor's price varies 3× by storefront and promo).

### Gaps
- **No RCT or peer-reviewed outcome trial for any of the eight apps** was found. All outcome claims are internal studies or testimonials.
- Several search-result "benchmarks" in this space (e.g. clinicalnutritionreport.com's six-app MAPE table naming an unheard-of leader at ±1.1%, consumertechwire.com's "Photo Logging 2.0 GA" story, ai-food-tracker.com) appear to be low-quality or synthetic SEO content: no author, no institution, implausible results, and no corroboration. **They were deliberately excluded from the findings above** and should not be cited in the final report. The only independent accuracy evidence I would stand behind is the NUTRITION 2026 abstract.
- Whether Foodvisor still offers RD chat is unresolved (first-party premium page says yes; a 2026 competitor review says it was removed).
- Retention, churn, DAU, and conversion are unpublished for all eight.
- Cal AI's and SnapCalorie's current IAP price ladders, and SnapCalorie's current coaching/chatbot status, could not be confirmed from first-party sources.

---

## Source List

**MacroFactor**
- https://macrofactor.com/macrofactor/ — feature list, coached/collaborative/manual modes, adherence-neutrality, Apple Health + Google Fit
- https://macrofactor.com/macrofactor-vs-cal-ai/ (updated 6 Apr 2026) — pricing ($11.99/mo, $71.99/yr), FLSI action counts, database size, Cal AI evaluation, "3× as accurate as static formulas"
- https://macrofactorapp.com/macrofactor-ai/ (updated 8 Apr 2025) — photo and photo+text AI logging, ingredient-level editability, "no performative chat"
- https://macrofactor.com/algorithm-accuracy/ — expenditure estimation and self-correction
- https://help.macrofactorapp.com/en/articles/222-how-does-macrofactor-make-adjustments-for-a-weight-gain-or-weight-loss-goal — weekly check-in mechanics, smoothing layer
- https://macrofactor.com/goal-features/ (4 Jun 2024) — dynamic maintenance, scale vs trend weight goals
- https://help.macrofactorapp.com/en/articles/102-integrations — Apple Health / Health Connect, 30-day backfill, data priorities
- https://help.macrofactorapp.com/en/articles/56-weight-or-nutrition-source-priority — fixed priority order
- https://help.macrofactorapp.com/en/articles/36-where-is-my-nutrition-synced — daily totals only, Nutrition page
- https://help.macrofactorapp.com/en/articles/65-connect-health-connect-or-apple-health — setup, smart scale example
- https://macrofactor.com/expenditure-modifiers/ — step-informed expenditure modifier
- https://macrofactor.com/workouts/ — separate Workouts app, rule-based progression, no shared coaching at launch, Workouts pricing ($11.99/mo, $71.99/yr, $47.99/6-mo)
- https://macrofactor.com/mm-september-2024/ — MF Coach and Coaching Modules
- https://macrofactor.com/mm-july-2026/ — "Plate Stack AI" and food-logging updates (title only)

**Carbon Diet Coach**
- https://www.joincarbon.com/pricing — $11.99/mo, $59.99/6-mo, $99.99/yr
- https://www.joincarbon.com/how-it-works — goals, barcode/verified DB, weekly check-in, Apple Health / Health Connect smart-scale import
- https://help.joincarbon.com/en/articles/5296570-what-is-carbon-and-how-does-the-coaching-system-work — three check-in questions, adjustment rules
- https://help.joincarbon.com/en/articles/14005628-how-carbon-sets-and-adjusts-your-macros (updated 9 Mar 2026) — Müller equation, LBM-based protein, diet preferences, compliance dependency
- https://help.joincarbon.com/en/articles/10338862-how-carbon-evaluates-your-progress-at-your-check-in (20 Mar 2026) — trend weight, check-in report contents
- https://help.joincarbon.com/en/articles/6078877-coach-trend-weight — experimental flag
- https://help.joincarbon.com/en/articles/16182813-log-meals-faster-with-carbon-s-smart-logger (3 Aug 2026) — Smart Logger photo/Describe, cloud-only, mixed-dish limitation
- https://help.joincarbon.com/en/articles/9222815-how-to-add-food — search + barcode
- https://help.joincarbon.com/en/articles/9573869-using-the-label-scanner — label scanner
- https://www.joincarbon.com/blog/release-77 (31 Jul 2026) — Smart Logging launch
- https://apps.apple.com/us/app/carbon-macro-coach-tracker/id1437820611 — 4.8/8.1K, iOS 16.6+, Apple Health body weight/fat read
- https://play.google.com/store/apps/details?hl=en&id=com.joincarbon.nutrition — full feature list, FatSecret DB, authors

**MyFitnessPal**
- https://support.myfitnesspal.com/hc/en-us/articles/360032625951-MyFitnessPal-Premium-features (28 Aug 2026) — Premium feature matrix
- https://support.myfitnesspal.com/hc/en-us/articles/30332897072269-How-to-log-food-with-your-voice (14 Sep 2026) — Voice Log constraints
- https://support.myfitnesspal.com/hc/en-us/articles/360045761612-How-to-use-the-Meal-Scanner (16 Sep 2026) — Meal Scan requirements and limits
- https://blog.myfitnesspal.com/winter-release-2026-nutrition-tracking-updates/ (20 Feb 2026) — photo upload, US iOS only
- https://support.myfitnesspal.com/hc/en-us/articles/360032271092-Apple-Health-connection-and-syncing (25 Aug 2026) — full sync matrix
- https://support.myfitnesspal.com/hc/en-us/articles/360032625731-Apple-Watch-App (10 Aug 2026) — Watch capabilities, active-calorie caveat
- https://support.myfitnesspal.com/hc/en-us/articles/47890508058125-Apple-Watch-workout-names-and-how-they-sync-to-MyFitnessPal (4 Aug 2026)
- https://support.myfitnesspal.com/hc/en-us/articles/360032273612-How-step-tracking-works-in-MyFitnessPal — Calorie Adjustment
- https://frontend.myfitnesspal.com/premium — Premium $79.99/yr, Premium+ $99.99/yr

**Lose It!**
- https://loseit.zendesk.com/hc/en-us/articles/51906561286804-Lose-It-Membership-Tiers-Pricing (9 Sep 2026) — $79.99/yr, Lifetime $299.99/$229.99
- https://loseit.zendesk.com/hc/en-us/articles/47492421271956-What-is-Lose-It-Lifetime (4 Aug 2026)
- https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It (4 Aug 2026) — photo logging flow, Premium + English only
- https://loseit.zendesk.com/hc/en-us/articles/49210381551380-How-to-Log-Food-in-Lose-It (25 Aug 2026) — all entry modes
- https://play.google.com/store/apps/details?hl=en_US&id=com.fitnow.loseit (26 Oct 2026) — GLP-1 tracker, Premium feature list, 56M+ food DB

**Cronometer**
- https://cronometer.com/gold/ — Gold pricing $4.99/mo annual ($59.99/yr) or $10.99/mo; feature split
- https://cronometer.com/features/track-food.html — four logging modes; free barcode
- https://cronometer.com/blog/crono-coach/ (28 Jul 2026) — Crono Coach scope and "will not automatically change" targets
- https://support.cronometer.com/hc/en-us/articles/49995994334100-Mobile-Crono-Coach (20 Jul 2026)
- https://support.cronometer.com/hc/en-us/articles/47549391461780-Mobile-Voice-Logging
- https://support.cronometer.com/hc/en-us/articles/47664884315412-Mobile-Siri-Voice-Logging (24 Jun 2026)
- https://cronometer.com/blog/4-ways-to-log-food-on-cronometer/ (14 May 2026) — when to use each mode
- https://apps.apple.com/us/app/cronometer-calorie-counter/id1145935738 — Apple Health/Watch, 1.1M foods, 95 nutrients, release notes incl. safety guardrails (v4.54.0)
- https://www.reddit.com/r/cronometer/comments/1u82jvf/crono_coach_data_sharingprivacy/ — Cronometer staff on LLM use

**Cal AI**
- https://www.calai.app/ — depth-sensor volume, photo/barcode/describe, "about 80% accurate"
- https://apps.apple.com/us/app/cal-ai-calorie-tracker/id6480417616 — subscription required for scan results, user reviews on barcode/label fallback
- https://techcrunch.com/2026/03/02/myfitnesspal-has-acquired-cal-ai-the-viral-calorie-app-built-by-teens/ — acquisition, MFP DB integration, 15M downloads, $30M revenue, "speed vs accuracy" positioning
- https://techcrunch.com/2025/03/16/photo-calorie-app-cal-ai-downloaded-over-a-million-times-was-built-by-two-teenagers/ — 90% accuracy claim, model stack
- https://truecal.com/how-accurate-is-cal-ai (6 Oct 2026) — [third-party] audit of Cal AI's accuracy claims
- https://www.thetimes.com/uk/healthcare/article/food-photo-app-counts-calories-does-it-work-g2wpxd09m (3 May 2025) — [third-party] hands-on failure cases
- https://macrofactor.com/macrofactor-vs-cal-ai/ — [competitor] price, expenditure behaviour, feature audit

**SnapCalorie**
- https://www.snapcalorie.com/ — "free forever" core, LiDAR, meal planner
- https://www.snapcalorie.com/faq.html — 15% error claim, oils limitation, Apple Health offset, Nutrition5k
- https://app.snapcalorie.com/what-is-snapcalorie — "flat plate" scope limit; drinks/bowls unfinished
- https://apps.apple.com/us/app/snapcalorie-ai-calorie-counter/id1574239307 — 4.7/6.9K, iOS 17+, English, LiDAR, HealthKit push, label scanner
- https://techcrunch.com/2023/06/26/snapcalorie-computer-vision-health-app-raises-3m/ — human reviewer layer, ChatGPT chatbot, <20% error claim
- https://openaccess.thecvf.com/content/CVPR2021/papers/Thames_Nutrition5k_Towards_Automatic_Nutritional_Understanding_of_Generic_Food_CVPR_2021_paper.pdf — Nutrition5k dataset paper

**Foodvisor**
- https://www.foodvisor.io/en — photo recognition positioning, 4.7/99,800 ratings
- https://www.foodvisor.io/en/premium/presentation — "Coaching by our dietitians", program design
- https://apps.apple.com/us/app/foodvisor-ai-calorie-counter/id1064020872 — entry modes, Apple Health, 15.83 lb claim + internal study detail, IAP rows
- https://foodvisor.zendesk.com/hc/en-us/articles/26650824663580-How-much-does-the-Foodvisor-subscription-cost (8 Apr 2026) — no fixed price
- https://www.foodvisor.io/en/guides/article/food-image-recognition-explained/ — API "95% precision" claim
- https://feastgood.com/foodvisor-review/ (29 Sep 2023) — [third-party] RD chat hands-on; targets do not auto-adjust
- https://www.reddit.com/r/Foodvisor/comments/1vzlnmb/does_foodvisor_automatically_recalculate_calorie/ (27 Aug 2026) — users confirm no recalculation
- https://www.garagegymreviews.com/foodvisor-review (2023) — [third-party] Apple Health activity pull-in, 500+ lessons, 300+ recipes
- https://www.shelog.ai/blog/foodvisor-review-2026 (30 Sep 2026) — [third-party] observed $14.99/mo, $83.99/yr, $119.99 family
- https://nutriscan.app/blog/posts/foodvisor-worth-it-2026-review-73e3363135 (2 May 2026) — [competitor, low reliability] claims RD chat removed — flagged as conflicting

**Independent accuracy evidence**
- https://cdn.nutrition.org/article/S2475-2991(26)01103-0/fulltext (Jul 2026) — NUTRITION 2026 abstract: 102 weighed meals, MFP/Lose It!/Cal AI all underestimate energy by 252–345 kcal and fat by ~30 g
