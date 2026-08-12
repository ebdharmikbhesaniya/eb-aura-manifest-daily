# App Store / Play Store Submission & Review Checklist

**Date:** 2026-08-10
**Source:** Glow teardown §7, §16 + Aura's own store-review constraints (paywall STORE-SETUP note).
**Goal:** ship the hard-paywall + trial build without an avoidable rejection, and fix the two failure modes Glow actually hit (privacy-questionnaire mismatch, missing legal links).

---

## The two rejections that are easy to avoid

### 1. App Privacy questionnaire ↔ privacy policy MISMATCH (Glow's actual rejection)

Apple's **App Privacy** section (App Store Connect → your app → App Privacy) asks, per data type, whether it's used for **Tracking** — which in Apple's language means _advertising or sharing with third parties / data brokers_, **not** "we store your name to greet you."

- [ ] Go through **every** collected data type and set **Tracking = No** unless you genuinely share it with third parties for ads. Glow was rejected for checking "yes" on everything unread.
- [ ] Make the questionnaire **exactly match** the written Privacy Policy. A mismatch is the flag.
- [ ] Aura specifics to declare honestly: **name / self-description / dream city / dream home / people / struggle** (onboarding answers, stored in Supabase, used to personalize — _not_ tracking), **email** (auth), **analytics** (PostHog / GA4 — declare as Analytics; set Tracking per whether you use IDFA/ad attribution — see below), **purchases** (RevenueCat).
- [ ] If you add **TikTok/ad attribution** (see ads plan) that uses IDFA, then **Tracking = Yes** for the relevant identifiers, and you must present **App Tracking Transparency (ATT)** prompt. Until then, keep Tracking = No and don't link the IDFA.
- [ ] On resubmit after any change, **add a reviewer note** explaining exactly what changed (Glow did this — speeds re-review).

### 2. Missing legal links on an auto-renewable-subscription paywall

Apple **rejects** subscription apps without functional **Terms of Use (EULA)** + **Privacy Policy** links, and the paywall footer hides a link it has no URL for.

- [ ] Confirm `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` are set for the production build. **Aura status:** already set in `apps/mobile/eas.json` `base.env` → `https://eb-aura-manifest-daily.onrender.com/terms` and `/privacy`. **Verify those URLs actually resolve** and describe the real data practices before submitting.
- [ ] The paywall must state, at the point of purchase: **price, trial length, that it auto-renews, and how to cancel** (Apple 3.1.2). **Aura status:** the trial-timeline shows "Free for 7 days, then {price}. Renews automatically." + "No commitment. Cancel anytime." + Restore. ✔

---

## Auto-renewable subscription requirements (both stores)

- [ ] **Restore Purchases** visible on the paywall. **Aura:** present in the footer. ✔
- [ ] Subscription **title, duration, price** clear before purchase. ✔ (trial-timeline)
- [ ] **Grace period** enabled (App Store Connect → Subscriptions → Billing Grace Period = **3 days**; Google Play → Monetize → Subscriptions → grace period). Recovers failed charges. Glow: ~10% of revenue. **Aura: not yet enabled — do this (see monetization plan).**
- [ ] A **7-day free-trial introductory offer** on the **hero (annual)** product, in **both** App Store Connect and Google Play. RevenueCat surfaces it as `introPrice.price === 0`; Aura's screen only shows the timeline when this exists. **Aura: pending store config.**
- [ ] RevenueCat entitlement id `premium` and product ids `aura_premium_annual|monthly|weekly` wired in both stores (they are in `packages/shared/src/contracts/subscriptions.ts`).

---

## The hard-paywall-specific review risk

A wall with **no free functionality** gets extra scrutiny. Mitigations already in Aura:

- [ ] The **escape hatch**: when no purchasable offering resolves (offline / no RC key / RC outage), the gate lets the user in — so a **reviewer on a flaky network is never bricked**. ✔ (routeGate + paywall route). _Keep this — it's also the review-safety valve._
- [ ] The **Letter plays free before the wall** — the reviewer sees real value before the ask. ✔
- [ ] Make sure a **sandbox / license-tester** account exists so the reviewer (and you) can complete a test purchase. Add reviewer notes with test steps.

---

## Metadata / listing (see ASO plan for keyword strategy)

- [ ] **Title** = brand + 2–3 primary keywords ("Aura: Manifest Daily" → consider "Aura: Daily Affirmations" or similar keyword-bearing subtitle). Glow renamed to "Glow — Daily Affirmations" for the keyword.
- [ ] **Subtitle** = supporting keywords.
- [ ] **Screenshots** for every required device size (Glow's "real pain" — do them in Figma from real app screens: onboarding, the Letter, a moment, the affirmation, the paywall).
- [ ] **App icon** — candidate for ASC Product Page Optimization A/B test later.
- [ ] **Privacy Policy + Terms** URLs entered in the listing (same as the paywall links).

---

## Faster uploads

- [ ] Use Apple's **Transporter** app (drag-drop the `.ipa`, Deliver) → ~5 min vs the free EAS-submit queue (1–2 h). Only helps App Store uploads, not Play.

---

## Pre-submit smoke test (device)

- [ ] Fresh install → onboarding → generating → **Letter (free)** → **wall** (no ✕, back doesn't exit).
- [ ] Purchase / trial via a **license-tester** account → lands Home; relaunch → stays Home.
- [ ] Relaunch unsubscribed → wall again (no bypass).
- [ ] Build with **no RC key** → straight to Home (escape hatch) — proves the reviewer can't get stuck.
- [ ] Terms / Privacy links open; Restore works.
