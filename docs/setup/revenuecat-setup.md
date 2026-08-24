# RevenueCat Setup — Steps

## 1. App Store Connect → create subscriptions

1. App Store Connect → your app → **Monetization → Subscriptions**.
2. Create a subscription group named `Aura Premium`.
3. Add product `aura_premium_annual`.
4. Add product `aura_premium_monthly`.
5. Add product `aura_premium_weekly`.
6. On `aura_premium_weekly`, add a **7-day free trial** intro offer.
7. Fill each product's price, localization, and review screenshot until status is **Ready to Submit**.

## 2. App Store Connect → In-App Purchase key

1. App Store Connect → **Users and Access → Integrations → In-App Purchase**.
2. **Generate** a key → download `SubscriptionKey_XXXX.p8` (one-time download).
3. Copy the **Key ID** (next to the key).
4. Copy the **Issuer ID** (top of the Keys page).

## 3. RevenueCat → finish "New App Store app" screen

1. App name: `Aura: Manifest & Affirmations (App Store)`.
2. App Bundle ID: `com.aura.manifestdaily`.
3. Custom URL Scheme: `aura` (optional — enables RevenueCat paywall previews; already registered in the app).
4. Upload the `.p8` file from step 2.
5. Paste **Key ID**.
6. Paste **Issuer ID**.
7. Leave Small Business Program and Shared Secret empty.
8. **Save changes.**

## 4. RevenueCat → Entitlement

1. **Product catalog → Entitlements** → create entitlement.
2. Identifier: `premium`.

## 5. RevenueCat → Products

1. **Product catalog → Products** → import/add `aura_premium_annual`.
2. Add `aura_premium_monthly`.
3. Add `aura_premium_weekly`.
4. Attach all three products to the `premium` entitlement.

## 6. RevenueCat → Offering

1. **Product catalog → Offerings** → create offering `default`.
2. Add a package for `aura_premium_annual`.
3. Add a package for `aura_premium_monthly`.
4. Add a package for `aura_premium_weekly`.
5. Mark offering as **Current**.

## 7. RevenueCat → copy iOS key

1. RevenueCat → **API keys**.
2. Copy the **App Store** key starting with `appl_`.

## 8. Put the key in the app

1. `apps/mobile/.env.local` → set `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_…`
2. `apps/mobile/eas.json` (line 17) → set `"EXPO_PUBLIC_REVENUECAT_IOS_KEY": "appl_…"`

## 9. Rebuild

1. Run an iOS build (`EXPO_PUBLIC_*` is baked at build time — a JS reload is not enough).

## 10. Test purchase

1. Create a **StoreKit sandbox tester** in App Store Connect → Users and Access → Sandbox.
2. Sign into the sandbox account on the test device.
3. Complete onboarding → letter → paywall shows plans → buy.

## 11. Before `eas submit`

1. `apps/mobile/eas.json` (line 67) → replace `"ascAppId": "TODO_APP_STORE_CONNECT"` with the numeric App Store Connect app ID (App Information → Apple ID).
