# Glow Case Study — Teardown & Learnings

**Date:** 2026-08-10
**Source:** Video transcript — a CS student's ~60-day challenge building "Glow" (a cozy affirmations app for Nordic winters) from scratch to ~$2,000/month **profit** (not revenue).
**Why this doc exists:** Glow is the closest possible comparable to Aura — a solo-built, RevenueCat-monetized, hard-paywalled affirmations app. Its founder A/B-tested his way to a working funnel and narrated every number. This file distills the _flow_ and the _learnings_; the sibling files turn them into Aura implementation + testing plans.

> **The one-sentence takeaway:** _"Spend ~90% of your time on the onboarding. More than 80% of conversions happen there. That's way more important than the app itself."_ Everything below is downstream of that.

---

## The headline numbers (Glow, steady state)

| Metric                                  | Glow's number               | Note                                                      |
| --------------------------------------- | --------------------------- | --------------------------------------------------------- |
| Download → trial start                  | **~14%** (best days 16–20%) | The number the onboarding moves                           |
| Trial → paid                            | **~31%**                    | The number the paywall + trial length move                |
| Revenue per download                    | **~$1.64**                  | = the whole funnel in one figure                          |
| Day-2 retention (early)                 | **~15%**                    | "sucked" — the problem that triggered ASO + tutorial work |
| Rating                                  | 4.7★ (55 ratings)           | Seeded by a free-lifetime launch                          |
| Ad cost per download (best creative)    | **<$0.10**                  | iOS default wallpaper + rhythmic music                    |
| MRR / trailing-28-day revenue at finish | ~$143 MRR / ~$2,800 rev     | Profit = revenue − 15% Apple − ad spend                   |

**Profit math Glow used:** `profit = revenue − 15% (Apple Small Business) − ad spend`. Free ad credits (TikTok + Apple) covered ~half of ad spend, which is what made the profit line clear the bar.

---

## The flow, phase by phase (with the learning at each step)

### 1. Idea & validation — _copy a proven category, change the angle_

- Went to the App Store **top-grossing** list; noticed affirmation apps everywhere ("one feature — show motivational quotes"). Top 3 were "literally identical."
- Differentiator: **target market**, not features — "cozy app for people going through dark Nordic winters / seasonal depression." Warm UI, quotes that acknowledge their reality.
- Screenshotted the incumbent's **entire** onboarding (40+ questions) and flow to learn the patterns; kept ~15 screens max.
- **Learning:** don't invent; take a proven monetizing category and win a _specific_ audience. The onboarding is the product's real surface.

### 2. Design — _identity before code_

- Figma first (button sizes, screens, shapes, colors) — "my code flows way faster when I know exactly what I want."
- Dribbble for a cozy/warm mood board.
- **Mascot** ("Glow", a candle that keeps glowing in the dark) generated via GPT following a known solo-dev tutorial. The mascot _is_ the brand and animates (bounce on load, "reads with you").
- **Learning:** a single warm character + a decided palette makes the app feel un-generic. Aura's equivalent is the **Orb** + Ember & Bone.

### 3. Build — _fast MVP, on-device, no auth_

- Expo project. **No login/signup — everything stored on-device** ("way easier"). Works in airplane mode.
- **Notifications** were the only "system" set up — local, no server backend; core to the daily-habit loop.
- Onboarding coded screen-by-screen ("copy-paste components, change text").
- **Widgets** (home-screen) written in **native Swift** (iOS first) — a tiny app showing a rotating quote each hour; tapping opens the app. Big engagement/retention surface.
- **Learning:** the daily-reminder + widget loop is the retention engine for a quotes app. Notifications are not optional — they're the product.

### 4. Monetization — _RevenueCat + hard trial paywall_

- Separate Apple developer account for clean separation.
- **Apple Small Business Program** → 15% cut instead of 30%. RevenueCat is free under $2,500/mo and handles receipt validation / subscription state.
- Products: **monthly ~$10, yearly ~$40 with a 3-day free trial**; per-country pricing for Nordic currencies.
- Paywall from a RevenueCat **template** (hero / testimonials / pricing), then integrated into the app.
- Later moved the paywall into the **onboarding**, split into **one-info-per-screen** steps.
- **Learning:** yearly + short free trial + hard gate is the monetization spine. Trial length and paywall wording are A/B-tunable levers.

### 5. Analytics DB — _instrument the funnel from day one_

- Supabase: `users` (onboarding answers) + `feedbacks` (feature requests). Onboarding answers double as **analytics + segmentation**.
- **Learning:** capture onboarding answers as data you'll act on (for-you recommendations, funnel analysis), not just to personalize copy.

### 6. Core app + content — _TikTok-for-quotes_

- Swipe up/down feed of quotes, double-tap to like, categories, "mix" of categories, favorites, streak, settings, feedback.
- Mascot micro-interactions (jumps, wears glasses to "read with you").
- **Learning:** the app itself is simple; delight lives in micro-interactions and the daily loop.

### 7. Landing page, policies, submission — _the boring blockers_

- NextJS landing page (Cloud wrote ~90%), Figma iPhone mockups.
- **Privacy Policy + Terms of Use are mandatory** for App Store submission (written with ChatGPT, "rewrite with a lawyer if it grows").
- Submit via `eas build` + `eas submit`.
- **App Store REJECTION (first submit):** the **App Privacy** section — he checked "used for **tracking**" (Apple = advertising/reselling to third parties) on everything without reading. Reviewer flagged a **mismatch between the privacy policy and App Store Connect**. Fix: uncheck tracking boxes, add a comment explaining the change. **No code change.**
- **Learning:** first-submission rejections are normal and usually metadata, not code. The **App Privacy questionnaire must match the privacy policy exactly.**

### 8. Launch traction — _free lifetime → downloads + reviews_

- Made the app **completely free with lifetime Pro** at launch to buy initial **downloads + App Store reviews** ("initial traction so the ASO algorithm starts showing us").
- Traffic came from surprising places (AppsFlyer-style referrers, WeChat shares, App Raven auto-page, one Reddit post ~3k views/10 upvotes, YouTube Shorts).
- **Reviews matter and you must reply to them** — "you're not answering the angry guy, you're showing future users you care." One 1★ was "couldn't buy premium" (because it was free).
- **Learning:** seed reviews and reply to every one. Recent reviews feed ranking.

### 9. ASO — _keywords are the free-traffic tap_

- Tool: **Astro**. Rule of thumb: pick keywords with **popularity > 20 and difficulty < 50**.
- **Title = 2–3 main keywords; subtitle = supporting keywords.** Localized keywords (e.g. Norwegian "helse" = health) rank with low competition.
- Apple ranking is a black box but favors **recent reviews on the targeted keywords** → seed reviews _after_ setting keywords.
- **Learning:** ASO is the compounding organic channel; title/subtitle are keyword real estate, and reviews are the ranking fuel.

### 10. Data-driven iteration — _only build what a metric asks for_

- Key metrics: **retention (most important), conversion, demographics.** "If users log in daily I won't have a problem converting them."
- Only **~2/3 of users allowed notifications** → added a **pre-permission explainer screen** and a **post-decline "you're missing something" screen**; measured the lift.
- **Learning:** guard the notification opt-in with framing screens on both sides; it protects the whole retention loop.

### 11. Organic content — _3 formats, test hooks_

- Warmed up a fresh TikTok account (like/comment in-niche, no posting) so the algorithm files the account into the niche before the first post.
- Three formats: **POV** ("POV: you finally found a wellness app for winter depression"), **product demo** (widgets/swipe), **transformation** ("I used this app 3 weeks, here's what changed"). Test hooks (change only the opening).
- ~15 videos, 2 broke 2k views → ~2 trials (both cancelled). Pinterest "glow-up in one month" format had crazy-low cost-per-click but poor post-click conversion (audience mismatch).
- **Learning:** organic is a numbers game and audience-fit dominates; a low CPC with no conversion means wrong-audience, not bad funnel.

### 12. Paid ads (TikTok) — _the scale lever_

- Needed **attribution**: TikTok Events SDK (not supported by RN/Expo → he built a native library on top of it). Without attribution TikTok can't optimize.
- Smart campaign, **iOS-14 dedicated**, app-install objective, ~€30/day, target Nordic countries, match ad **language to app language**.
- **Run each test ≥3 days** so the algorithm can learn; don't cut early. Test **6 creatives**, then pour remaining budget on the winner.
- **Free credits**: TikTok "spend $200 get ~$200", Apple Ads $100 promo → nearly half of ad spend was free credits (decisive for profit).
- **Time-of-day targeting**: analyzed RevenueCat trial-start distribution by hour, ran ads only in the best windows.
- Early result: 10 trials, **0 paid** → losing money. Diagnosis: users cancel the trial 2–3 min after starting → **they never saw the value**.
- **Learning:** attribution first, 3-day learning windows, chase free credits, and a trial-to-paid of ~0 means the _post-onboarding value moment_ is missing, not the ad.

### 13. Onboarding optimization — _where all the money was_

The big compounding wins, in order he found them:

- **Ask more questions** to segment the user (the "less personal / fewer questions" variants _killed_ conversion — removing 3 personal questions drove conversion to ~0). Personalization questions are load-bearing, not friction.
- **"For You" section**: recommend categories from onboarding answers → the value moment right after onboarding.
- **Post-onboarding tutorial**: coach-marks (bouncy animation to tap the category badge, install-the-widget prompt) + a first-session **goal** so they _use_ the app in the first minute.
- **Progress bar** during onboarding (he'd "completely forgot" it) → higher completion.
- **Commitment psychology**: a "**tap/hold to commit**" screen ("I, [name], will use Glow to feel more self-confident", fingerprint fills as you hold) **just before the paywall** → dramatically better paywall conversion (pattern from Cal/Duolingo/Headway/RevenueCat).
- **One information per screen** in the paywall sequence: screen 1 = "3-day free trial", screen 2 = "reminder one day before", screen 3 = "what you get". _Never one paywall with everything_ — users won't read it and miss info. **(This is exactly the trial-timeline Aura just shipped — validation.)**
- **Grace period** (App Store Connect → billing grace period = 3 days): Apple retries a failed charge for 3 days while the user keeps premium → recovered **~10% of revenue** for zero work. **Turn it ON.**
- **Learning:** onboarding completion → trial start → trial-to-paid are three separate dials; segmentation questions, a value moment, a commitment beat, and a multi-screen trial explainer each move a different one.

### 14. A/B testing everything — _let data pick_

- **PostHog experiments** for onboarding variants (control / no-pact / fewer questions / reordered). Metrics: **onboarding completion** and **onboarding conversion**. Winner: the **"no pact"** variant (a screen removed). Needed ~300+ users through the test for signal.
- **RevenueCat experiments** for **paywall design** variants (primary metric: initial conversion rate; ~50+ conversions per variant per RC guidance).
- **App Store Connect Product Page Optimization** to A/B the **app icon**.
- **Learning:** three independent A/B surfaces — onboarding (PostHog), paywall (RevenueCat), store listing (ASC PPO). Small changes swing revenue; never guess.

### 15. Later features — _value + premium surface_

- **TTS "Practice"**: an AI voice (Gemini TTS) reads affirmations in a story-style UI; audio pre-generated to Supabase, downloaded on open. **(Aura already bakes ElevenLabs voice — this is Aura's strength, not a gap.)**
- **Themes / selectable backgrounds** as a premium feature (parity with competitors). **Dark mode** (20 requests). Both premium upsells + retention.
- **Rename for keywords**: "Glow — Daily Affirmations" (title carries the keyword).
- **Learning:** premium value beyond "unlimited" (voices, themes, backgrounds) raises trial-to-paid; dark mode and TTS were top requests.

### 16. Operational tips

- **Transporter app** (Apple) uploads a build to App Store Connect in ~5 min vs the free EAS submit queue (1–2 h).
- Fronted his own cash while Apple holds payouts 30–45 days (a real cash-flow gap; RevenueCat is building a financing feature for it).
- **Enjoy the process** — the closing thesis; most time is the process, little is the result.

---

## Aura vs Glow — quick orientation (full gap analysis in the sibling file)

Aura is **ahead** of Glow on: baked **voice** (ElevenLabs, server-side) vs Glow's late TTS; a real **generative Letter/moment** (a genuine "wow") vs static quotes; a considered **design system** (Ember & Bone, the Orb) vs a GPT mascot; a just-shipped **hard paywall + trial-timeline** (exactly Glow's one-info-per-screen pattern); and a proper **onboarding Conversation** with a `ProgressHeader`.

Aura is **behind / unverified** on the growth machinery Glow proved out: **commitment screen**, **pre/post notification-permission framing**, **post-onboarding tutorial + "For You"**, **A/B-testing infra** (PostHog experiments / RevenueCat experiments / ASC PPO), **billing grace period**, **home-screen widgets**, **ASO keyword strategy**, and **paid-ads attribution**. These are the sibling plans.

---

## Files in this set

- `2026-08-10-glow-case-study-teardown.md` — this file (the flow + learnings).
- `2026-08-10-aura-gap-analysis.md` — Glow feature/lever → does Aura have it? priority.
- `2026-08-10-onboarding-conversion-plan.md` — implementation + testing for the onboarding dials.
- `2026-08-10-monetization-paywall-plan.md` — paywall steps, trial, grace period, pricing, RC experiments.
- `2026-08-10-analytics-abtesting-plan.md` — funnel events, PostHog/RC/ASC A/B testing, metrics.
- `2026-08-10-aso-ads-launch-plan.md` — ASO, reviews, organic formats, paid-ads attribution, launch.
- `2026-08-10-appstore-submission-checklist.md` — privacy questionnaire, legal, Transporter, rejections.
- `README.md` — index + prioritized roadmap.
