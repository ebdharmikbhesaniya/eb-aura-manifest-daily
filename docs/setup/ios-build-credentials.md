# iOS Build Credentials — Steps

Set up an App Store Connect API key so `eas build` / `eas submit` never need
interactive Apple login.

## 1. Create the App Store Connect API key
1. Open **App Store Connect** → **Users and Access**.
2. Go to the **Integrations** tab → **App Store Connect API** (Team Keys).
3. Need **Admin** or **Account Holder** role. If prompted, **Enable / Request Access** once.
4. Click **+** (Generate API Key).
5. Name: `EAS CI`.
6. Access: **App Manager**.
7. Click **Generate**.

## 2. Collect the key details
1. Click **Download** on the new key → saves `AuthKey_XXXXXXXXXX.p8` (one-time download).
2. Copy the **Key ID** (in the key's row).
3. Copy the **Issuer ID** (top of the Keys list).

## 3. Add the key to EAS
1. In terminal:
   ```
   cd apps/mobile
   eas credentials
   ```
2. Choose **iOS** → **production**.
3. Choose **App Store Connect API Key** → **Set up a new key**.
4. Point it at the `.p8` file.
5. Paste **Key ID**.
6. Paste **Issuer ID**.

## 4. Build iOS
1. Run:
   ```
   cd apps/mobile
   eas build --platform ios --profile production
   ```
2. On the first interactive run, accept the auto-generated Distribution Certificate and Provisioning Profile.

## 5. Before `eas submit`
1. `apps/mobile/eas.json` → replace `"ascAppId": "TODO_APP_STORE_CONNECT"` with the numeric App Store Connect app ID (App Information → Apple ID).

## Notes
- The `.p8` is a secret — upload it directly to EAS; never commit it.
- This key is separate from the RevenueCat In-App Purchase `.p8` (that one reads subscriptions; this one builds/submits).
- Prerequisite: paid Apple Developer Program membership (team `Q8Z48Q7K2B`) and bundle `com.aura.manifestdaily` registered as an App ID.
