# ASO, Organic Content, Paid Ads & Launch Plan

**Date:** 2026-08-10
**Source:** Glow teardown §8–§12, §14.
**Goal:** the acquisition + ranking machinery around the funnel. Order of operations matters — **fix the funnel first (onboarding + paywall), then drive traffic**, or you pay to fill a leaky bucket.

> Glow's sequencing lesson: he wasted early ad spend (10 trials, 0 paid) because the **post-onboarding value moment was missing**. Only after onboarding/tutorial/for-you fixes did ads become profitable. **Do the onboarding-conversion-plan work before scaling ads.**

---

## Phase 0 — instrument before you spend

- [ ] Confirm the funnel is fully tracked (see analytics plan): `download → onboarding_start → each onboarding screen → paywall_viewed → trial_started → purchase_completed`.
- [ ] Attribution wired **before** the first paid campaign (below), or the ad platform can't optimize.

## Phase 1 — ASO (the compounding free channel)

- **Rule of thumb (Astro / any ASO tool):** target keywords with **popularity > 20, difficulty < 50**.
- **Title** = brand + 2–3 primary keywords; **subtitle** = supporting keywords. Localize keywords per market (Glow ranked on Norwegian "helse").
- Aura candidates to research: _affirmations, daily affirmations, manifest / manifestation, law of attraction, self-love, confidence, gratitude, morning routine, calm, mindset._ Aura's edge = "manifest" + "letter from your future self" — less contested than "affirmations."
- Apple ranking favors **recent reviews on the targeted keywords** → set keywords first, then seed reviews.
- [ ] Draft title/subtitle variants; pick per-market keyword sets; queue an **ASC Product Page Optimization** icon test (analytics plan).

## Phase 2 — seed reviews & initial traction

- Glow's move: a **free-lifetime-Pro launch window** to buy downloads + reviews so the store algorithm starts surfacing the app. Aura alternative (keeps the hard paywall intact): a **time-boxed "founding member" free-premium code drop** to a small cohort (Reddit, Discord, beta list) in exchange for honest reviews — _without_ making the whole app free.
- [ ] **Reply to every review** (Glow: "you're showing future users you care"). Set up a review-response cadence.
- [ ] Seed 20–50 genuine ratings from real early users before spending on ads.

## Phase 3 — organic content (numbers game, audience-fit dominates)

- **Warm the account first:** on a fresh TikTok/IG account, like/comment in-niche for a few days, post nothing, so the algorithm files you into the niche.
- **Three formats** (test hooks — change only the opening 1–2s):
  1. **POV** — "POV: you finally found an app that writes you a letter from your future self."
  2. **Product demo** — the Letter arriving, a moment playing with the Orb, the affirmation, widgets.
  3. **Transformation** — "I manifested with Aura for 21 days, here's what changed."
- Aura's **Letter/voice** is a stronger demo asset than static quotes — lean into the audio reveal.
- **Caveat (Glow):** a low cost-per-click with no post-click conversion = **wrong audience**, not a bad funnel (his dev-heavy YouTube converted terribly; Pinterest "glow-up" CPC was great but off-audience). Match creative audience to buyer audience.
- [ ] Produce 10–20 pieces, post 2–3/day, keep the winners, iterate on the winning format only.
- [ ] Link-in-bio (Linktree or similar) with click tracking → App Store.

## Phase 4 — paid ads (the scale lever)

**Attribution first (non-negotiable):**

- TikTok needs install/trial events to optimize. **TikTok Events SDK is not supported by RN/Expo** — Glow built a native shim. Options for Aura:
  - Use a **Mobile Measurement Partner** (AppsFlyer/Adjust) — simplest, has RN SDKs, but per-install cost.
  - Or a native TikTok Events bridge (expo config plugin / custom native module) — cheaper, more work.
  - **Note the ATT/privacy implication:** IDFA-based attribution flips App Privacy "Tracking = Yes" and requires the **ATT prompt** (see submission checklist).
- **Campaign settings (Glow's working setup):** app-install objective, **iOS-14 dedicated** campaign, Smart campaign (let the platform target), match **ad language to app language**, target chosen markets, ~$25–50/day.
- **Run each test ≥ 3 days** — don't cut early; the algorithm needs the learning phase. Test ~6 creatives, then concentrate budget on the winner.
- **Chase free credits:** TikTok "spend $X get ~$X" new-account coupons; Apple Ads $100 promo credit. Glow: ~half of spend was free credits — decisive for profit.
- **Time-of-day targeting:** pull trial-start distribution by hour from RevenueCat, run ads only in the best windows.
- Best-performing creative type (Glow): simple, native-format vertical video (iOS default-wallpaper + rhythmic music at **<$0.10/download**; $20 UGC clips from a creator worked well).

## Phase 5 — measure, and only scale a working unit

- The unit economics gate: **revenue per download > blended cost per download**. Glow's steady RPD ≈ **$1.64**.
- [ ] Only increase daily ad spend once download→trial and trial→paid are stable and RPD clears CPD. Then "reinvest, reinvest, reinvest."

---

## Aura-specific channel ideas (beyond Glow)

- The **Letter from your future self** is inherently shareable — a "share your letter as an image" moment (already a gated feature: `share_export`) is native content fuel; feature it in demos.
- The **Discord/community** angle Glow built late — Aura could seed a founding community for feedback + reviews + UGC.
