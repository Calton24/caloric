# Split RevenueCat + App Store into Dev vs Prod

**Goal:** Separate dev and production billing environments.

## Tasks

1. Create new App Store app:
   - Bundle ID: `com.calton.caloric`

2. Duplicate products in App Store Connect:
   - `calcut_weekly`
   - `calcut_monthly`
   - `calcut_annual`
   - `calcut_annual_challenge`

3. Create separate RevenueCat app for dev

4. Configure separate API keys:
   - `EXPO_PUBLIC_REVENUECAT_API_KEY_DEV`
   - `EXPO_PUBLIC_REVENUECAT_API_KEY_PROD`

5. Update billing config to switch based on `EXPO_PUBLIC_APP_ENV`

6. Ensure backend (Supabase / Edge Functions) supports dual RevenueCat secrets

7. Validate:
   - Dev purchases do NOT affect production users
   - Offerings load correctly in both environments

## Note

This is deferred until after initial launch to avoid complexity during MVP phase.
