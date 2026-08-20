# App Store submission — what is left

**Aura: Manifest Daily** · `com.aura.manifestdaily` · ASC app `6795523727` · iOS 1.0
Status as of 2026-08-20. Every claim below was checked against the live host or the
code, not assumed — where something is unverified it says so.

---

## 1 · Blocking, and App Store Connect already says so

These are the exact items in the red "Unable to Add for Review" panel.

- [ ] **Support URL** — required, empty. The page is now built; paste
      `https://eb-aura-manifest-daily.onrender.com/support` **once the backend is
      redeployed** (it 404s until then). A `mailto:` is not accepted.
- [ ] **App Review sign-in — User name + Password** — required, empty.
      **You cannot fill these today.** `EMAIL_AUTH_ENABLED` is `false`
      (`apps/mobile/src/features/auth/emailAuthEnabled.ts:17`), so the app offers
      Google and Apple only and no username/password exists. Pick one: - **A.** Flip `EMAIL_AUTH_ENABLED` to `true`, rebuild, create a test account.
      The file states everything behind the flag is left in place and it can be
      turned back on with no other change. Gives Apple exactly what the field wants. - **B.** Create a dedicated **Google** account and enter it. Sign in with it
      yourself once first — a brand-new Google account that trips a security
      challenge on the reviewer's device is an invisible rejection.
- [ ] **Privacy Policy URL** → App Privacy.
      Use `https://eb-aura-manifest-daily.onrender.com/privacy` — verified 200.
- [ ] **Content Rights** → App Information. Answer: **no third-party content**.
      Letters and affirmations are original generated output; fonts and art are
      licensed or your own.
- [ ] **App Privacy practices** → App Privacy. Must be completed by an **Admin**.
      Per `docs/18-PRIVACY-SAFETY.md`, declare: Contact Info (email),
      User Content (gratitude entries, typed desires), Identifiers (user id),
      Usage Data (analytics). **Not used for tracking** — no cross-app tracking,
      no data sale.
- [ ] **Price tier** → Pricing. Set the app **Free**; revenue is via subscription.
- [ ] **Choose a build** — nothing uploaded yet. Largest remaining item.

---

## 2 · Blocking, found in the code and config

- [ ] **Paid Applications Agreement is not active.** Business → Agreements, Tax and
      Banking. Until it is, App Store Connect hides every pricing and availability
      control — which is why the subscription page reads _"You don't have permission
      to set up any pricing"_ and Duration shows `-`. Must be accepted by the
      **Account Holder**, with banking and tax forms completed. **Nothing else in
      the subscription flow can proceed until this is Active.**
- [ ] **Two of three subscriptions do not exist.** The app looks for three exact
      product ids (`packages/shared/src/contracts/subscriptions.ts:66`). Only the
      annual one has been created:

      | Product ID              | Duration | Price   | Trial |
          |-------------------------|----------|---------|-------|
          | `aura_premium_annual`   | 1 year   | $39.99  | no    |
          | `aura_premium_monthly`  | 1 month  | $14.99  | no    |
          | `aura_premium_weekly`   | 1 week   | $6.99   | **7-day free trial** |

          IDs must match character for character or `getOfferings()` returns nothing.

- [ ] **Annual price mismatch.** ASC reportedly has **$49.99**; `FALLBACK_PRICING`
      has **39.99**. The paywall prints the fallback when RevenueCat is not
      configured, so the screenshot and the store would disagree — the
      misleading-price complaint the code comment itself warns about.
      Fix one side. **Unverified** — I could not read the ASC price (locked by §2.1).
- [x] ~~**`/support` returns 404.**~~ **Built** — `SUPPORT` document plus a
      `/support` route on `LegalController`, same pattern as the three beside it.
      **Still needs a backend redeploy before the URL resolves.**
- [x] ~~**The in-app support address is dead.**~~ **Fixed** — `SUPPORT_EMAIL` is
      now `emperorbrains.official@gmail.com`, matching the support page, and the
      three social links pointing at the unresolvable domain are blanked so their
      rows do not render. Ships with the next build.
- [ ] **iOS RevenueCat key is commented out** in both `.env` and `.env.local`.
      `configurePurchases` returns early on a missing key, so on iOS RevenueCat
      never configures, everyone resolves to free, and the paywall shows
      display-only prices that cannot be purchased. Set
      `EXPO_PUBLIC_REVENUECAT_IOS_KEY` before building for review.
- [ ] **Wire RevenueCat.** All three product ids added, attached to an entitlement
      named exactly **`premium`**, in an Offering marked **current**, plus the ASC
      shared secret / In-App Purchase key so receipts validate.

---

## 3 · Already prepared — just paste or upload

In `~/Downloads/aura-appstore-ready/`:

- [ ] **Screenshots** — `aura-01` … `aura-08`, each exactly **1242 × 2688**.
      Upload 01–08 in order. **`aura-09` is a duplicate of `aura-01`** — drop it.
- [ ] **Subscription promo image** — `aura-subscription-1024x1024.png`.
      1024 × 1024, no alpha, no rounded corners, no pricing text.
      Prefer this over anything in `image-catalog/`: those are off-brand
      (pale gold orb, not Newsreader) and three of the four are the wrong size.
- [ ] **Description, Promotional Text, Keywords, Copyright** — written and
      length-checked (2206/4000, 157/170, 95/100).
- [ ] **App Review Notes** — written, 3135/4000.
      Replace `<EMAIL>` / `<PASSWORD>` once §1 sign-in is decided.
- [ ] **Subscription Review Notes** — written for annual, monthly and weekly.
- [ ] **Marketing URL** — leave **empty**. `auramanifestdaily.com` does not resolve,
      and Apple checks the field when it is filled.

Still to make:

- [ ] **IAP review screenshot** — a real capture of the paywall, per subscription.
      Must show the price, the auto-renew line, and Restore / Terms / Privacy.
      **The weekly one must be a separate capture** — weekly is the only plan with
      `hasTrial: true`, so it renders the trial layout with an ember
      "Start your free trial" CTA instead of the ink "Continue".

---

## 4 · Verify before submitting

- [ ] **Render cold start.** `/privacy` took **9.3s** cold and 0.7s warm — the free
      tier sleeps. A reviewer opening a sleeping Privacy Policy or Support URL sees
      a hang, and that is a routine rejection. Move to an always-on tier, or host
      the legal and support pages as static files somewhere that never sleeps.
- [ ] **Legal entity is inconsistent.** Copyright should read `2026 Emperor Brains LLP`,
      but the live legal pages say `EmperorBrains` (one word,
      `apps/backend/src/legal/legal.content.ts:23`) and the ASC team reads
      _Raju Khunt_. Make the copyright field, the legal pages and the ASC seller
      name all the same registered name.
- [ ] **Age rating vs Terms.** Carry-over, **unverified**: confirm the Terms state a
      17+ minimum age if that rating override is set.
- [ ] **Terms and Privacy URLs resolve in-app** — `EXPO_PUBLIC_TERMS_URL` and
      `EXPO_PUBLIC_PRIVACY_URL` are required on the paywall footer for an
      auto-renewable subscription.

---

## Critical path

The agreement gates the money, the money gates the subscriptions, and the
subscriptions must ship with the build. So:

1. **Paid Applications Agreement → Active.** Blocks §2.2, §2.3 and all pricing.
2. **Decide the reviewer sign-in** (flip the email flag, or make a Google account).
   Decides whether a rebuild is needed, so it comes before the build.
3. **Fix the host**: add `/support`, swap the dead support email, address cold start.
4. **Fill §1** — everything there is form-filling once 1–3 land.
5. **Create the two missing subscriptions**; price all three; add the weekly trial;
   fill duration, localization, availability and review info.
6. **Set the iOS RevenueCat key**, wire the `premium` entitlement and current Offering.
7. **Build → archive → upload**, then capture the IAP review screenshots from that
   build so they match what the reviewer runs.
8. **Attach the build, attach the three subscriptions to the 1.0 draft, submit.**
   The first subscription group must be submitted _with_ an app version — the
   "Your first subscription group must be submitted with a new app version" banner
   is informational, not an error.
