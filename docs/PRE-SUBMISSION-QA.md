# Pre-Submission QA Checklist

**App Name:** Caloric  
**Version:** 1.0.0  
**Build Date:** ****\_****  
**Tester:** ****\_****  
**Status:** 🔴 Not Started

---

## Table of Contents

1. [Environment & Build Verification](#environment--build-verification)
2. [Core Features Testing](#core-features-testing)
3. [Authentication & Security](#authentication--security)
4. [Privacy & Compliance](#privacy--compliance)
5. [Subscriptions & Monetization](#subscriptions--monetization)
6. [Analytics & Error Reporting](#analytics--error-reporting)
7. [Platform-Specific Features](#platform-specific-features)
8. [User Experience & Polish](#user-experience--polish)
9. [Performance & Stability](#performance--stability)
10. [App Store Requirements](#app-store-requirements)

---

## Environment & Build Verification

### Build Configuration

- [ ] App built with `caloric-store` profile (not dev)
- [ ] Bundle identifier is production (`com.calton24.caloric`)
- [ ] Version number is correct in app.json
- [ ] Build number auto-incremented
- [ ] All environment variables set correctly
- [ ] No `.dev` suffix in bundle ID or display name
- [ ] App scheme is `caloric://` (not `caloric-dev://`)

### Installation & Launch

- [ ] **iOS:** App installs successfully from TestFlight
- [ ] **Android:** App installs successfully from Play Console Internal Testing
- [ ] **iOS:** App launches without crash on iPhone (iOS 15+)
- [ ] **Android:** App launches without crash on Android (12+)
- [ ] Splash screen displays correctly
- [ ] No console errors or warnings on launch
- [ ] App icon displays correctly in home screen

---

## Core Features Testing

### Onboarding Flow

- [ ] Landing screen displays correctly
- [ ] Can navigate to Sign Up
- [ ] Can navigate to Sign In
- [ ] Onboarding tutorial displays (if applicable)
- [ ] Goal setting flow works correctly
- [ ] Profile creation completes successfully
- [ ] Redirects to main app after onboarding

### Meal Logging

- [ ] **Manual Entry:** Can log a meal manually
- [ ] **Camera Log:** Camera opens and captures food image
- [ ] **Voice Log:** Microphone captures voice input
- [ ] **Food Analysis:** AI correctly identifies food items
- [ ] **Nutrition Data:** Calorie and macro data displays correctly
- [ ] **Meal History:** Past meals display in timeline
- [ ] **Edit Meal:** Can edit existing meal entries
- [ ] **Delete Meal:** Can delete meal entries

### Weight Tracking

- [ ] Can log weight entry
- [ ] Weight unit respects user preference (lbs/kg)
- [ ] Weight history displays as chart
- [ ] Weight syncs with Apple Health (iOS)
- [ ] Weight export works correctly

### Goals & Progress

- [ ] Goal calculator computes calorie budget
- [ ] Daily calorie budget displays correctly
- [ ] Progress chart shows weight over time
- [ ] Streak counter updates correctly
- [ ] Goal edit flow works correctly

### Data Export

- [ ] Export Meals as CSV downloads correctly
- [ ] Export Weight as CSV downloads correctly
- [ ] Export All Data combines meals + weight
- [ ] CSV files open in Numbers/Excel correctly
- [ ] Data is complete and accurate

---

## Authentication & Security

### Sign Up

- [ ] **Email/Password:** New account creation works
- [ ] **Google Sign-In:** OAuth flow completes (iOS & Android)
- [ ] **Apple Sign-In:** OAuth flow completes (iOS only)
- [ ] Email verification sent (if applicable)
- [ ] User redirected to onboarding after signup

### Sign In

- [ ] **Email/Password:** Existing user can sign in
- [ ] **Google Sign-In:** OAuth flow completes
- [ ] **Apple Sign-In:** OAuth flow completes (iOS)
- [ ] Invalid credentials show error message
- [ ] "Forgot Password" flow works
- [ ] User redirected to home after signin

### Password Reset

- [ ] Password reset email sent
- [ ] Reset link opens app correctly
- [ ] New password saves successfully
- [ ] Can sign in with new password

### Session Management

- [ ] User stays signed in after app restart
- [ ] Sign out clears session correctly
- [ ] Auth token refreshes automatically
- [ ] No auth token exposed in logs

### Account Deletion

- [ ] "Delete Account" button visible in Settings
- [ ] Confirmation dialog displays warning
- [ ] Account deletion completes successfully
- [ ] User data removed from Supabase
- [ ] Local storage cleared
- [ ] Redirected to onboarding after deletion
- [ ] Cannot sign in with deleted account

---

## Privacy & Compliance

### Consent Flow

- [ ] **First Launch:** Consent modal displays after onboarding
- [ ] **Analytics Toggle:** Can enable/disable analytics
- [ ] **Tracking Toggle:** Can enable/disable tracking (iOS)
- [ ] **Marketing Toggle:** Can enable/disable marketing emails
- [ ] **Crash Reporting Toggle:** Can enable/disable crash reports
- [ ] "Accept All" grants all permissions
- [ ] "Save Preferences" respects individual choices
- [ ] Consent saved correctly to storage
- [ ] Consent only shows once (not on every launch)

### App Tracking Transparency (iOS)

- [ ] **iOS 14.5+:** ATT prompt displays correctly
- [ ] **Prompt Text:** NSUserTrackingUsageDescription displays
- [ ] **Allow:** Grants tracking permission
- [ ] **Deny:** Respects denial, no tracking
- [ ] **Consent Integration:** ATT prompt triggers with consent modal
- [ ] **Not Determined:** Prompt shows on first appropriate request
- [ ] **Restricted:** Gracefully handles parental controls

### Privacy Policy & Terms

- [ ] Privacy Policy link opens in browser
- [ ] Privacy Policy URL is correct and accessible (https://caloric-sage.vercel.app/privacy)
- [ ] Terms of Service link opens in browser
- [ ] Terms of Service URL is correct and accessible (https://caloric-sage.vercel.app/terms)
- [ ] Legal documents display correctly on web

### Permissions

- [ ] **Camera:** Permission prompt displays with usage description
- [ ] **Microphone:** Permission prompt displays with usage description
- [ ] **Motion & Fitness:** Permission displays (iOS, for Live Activity)
- [ ] **Health (Read):** Permission displays (iOS)
- [ ] **Health (Write):** Permission displays (iOS)
- [ ] **Notifications:** Permission displays when requesting
- [ ] All permissions respect user denial gracefully

---

## Subscriptions & Monetization

### In-App Purchases (RevenueCat)

- [ ] **Paywall:** Displays available subscription options
- [ ] **Monthly Plan:** Can purchase monthly subscription
- [ ] **Yearly Plan:** Can purchase yearly subscription
- [ ] **Free Trial:** Trial period displays correctly (if applicable)
- [ ] **Purchase Flow:** iOS/Android native purchase UI displays
- [ ] **Sandbox Account:** Test purchase completes (sandbox mode)
- [ ] **Receipt Validation:** RevenueCat validates receipt
- [ ] **Pro Status:** User unlocks pro features after purchase

### Subscription Management

- [ ] **Current Plan:** Displays in Settings correctly
- [ ] **Manage Subscription:** Opens Apple/Google subscription settings
- [ ] **Restore Purchases:** Restores previous purchase
- [ ] **Restore Loading State:** Shows "Restoring..." during restore
- [ ] **Customer Center:** RevenueCat customer center opens
- [ ] **Downgrade:** Can downgrade from yearly to monthly
- [ ] **Cancel:** Can cancel subscription (via platform)

### Paywall Triggers

- [ ] Paywall shows when accessing pro-only feature
- [ ] Paywall shows after free plan limit reached
- [ ] Paywall can be dismissed (with "X" or back button)
- [ ] Paywall doesn't block essential features

### Revenue Event Tracking

- [ ] Purchase event sent to analytics (PostHog)
- [ ] Subscription status updated in Supabase
- [ ] Trial started event tracked
- [ ] Cancellation event tracked

---

## Analytics & Error Reporting

### PostHog Analytics

- [ ] **API Key:** Production PostHog key configured
- [ ] **Events:** Events appear in PostHog dashboard
- [ ] **Screen Views:** Automatic screen tracking works
- [ ] **Custom Events:** Custom events track correctly
- [ ] **User Identity:** User ID associated with events
- [ ] **Consent:** Analytics disabled if user denies consent

### Sentry Error Reporting

- [ ] **DSN:** Production Sentry DSN configured
- [ ] **Crash Report:** Test crash captured in Sentry
- [ ] **Error Context:** User ID, device info included
- [ ] **Source Maps:** Stack traces show correct file/line
- [ ] **Breadcrumbs:** Navigation breadcrumbs captured
- [ ] **Consent:** Crash reporting respects user consent

### In-App Review Prompts

- [ ] Review prompt triggers after 5 meals logged
- [ ] Review prompt shows native iOS/Android UI
- [ ] Review prompt only shows once per user
- [ ] Review prompt doesn't crash if unavailable
- [ ] Prompt timing feels natural (not intrusive)

---

## Platform-Specific Features

### iOS-Specific

- [ ] **Apple Sign-In:** OAuth flow completes
- [ ] **Apple Health Integration:** Reads weight data
- [ ] **Apple Health Integration:** Writes meal/weight data
- [ ] **Live Activities:** Pedometer data displays (if enabled)
- [ ] **Dynamic Island:** Live Activity shows correctly (iPhone 14 Pro+)
- [ ] **Face ID/Touch ID:** Biometric auth works (if applicable)
- [ ] **Dark Mode:** App respects system dark mode
- [ ] **Safe Area:** Content respects notch/home indicator
- [ ] **Haptics:** Tactile feedback works correctly
- [ ] **Share Sheet:** iOS share sheet opens correctly

### Android-Specific

- [ ] **Google Sign-In:** OAuth flow completes
- [ ] **Back Button:** Android back button works correctly
- [ ] **Edge-to-Edge:** Content respects gesture navigation
- [ ] **Adaptive Icon:** Themed icon displays correctly
- [ ] **Dark Mode:** App respects system dark mode
- [ ] **Permissions:** Android 13+ permissions work
- [ ] **Share Intent:** Android share works correctly

---

## User Experience & Polish

### Navigation

- [ ] Tab navigation works smoothly
- [ ] Back button/gesture works correctly
- [ ] Deep links open correct screen
- [ ] Modal transitions smooth
- [ ] No navigation stack bugs

### UI/UX

- [ ] All text readable (no truncation)
- [ ] All buttons tappable (sufficient hit area)
- [ ] Loading states display correctly
- [ ] Error states display helpful messages
- [ ] Empty states display helpful instructions
- [ ] Dark mode colors look correct
- [ ] Light mode colors look correct (if supported)
- [ ] Animations smooth (no jank)
- [ ] Keyboard doesn't hide input fields
- [ ] Scroll views scroll smoothly

### Accessibility

- [ ] VoiceOver works (iOS) - test basic navigation
- [ ] TalkBack works (Android) - test basic navigation
- [ ] Text scales with system font size
- [ ] Sufficient color contrast (WCAG AA)
- [ ] Interactive elements labeled correctly
- [ ] No accessibility warnings in Xcode/Android Studio

### Localization

- [ ] English text displays correctly
- [ ] Date/time formats correct for locale
- [ ] Number formats correct for locale
- [ ] Currency formats correct (if applicable)

---

## Performance & Stability

### App Launch

- [ ] Cold start < 3 seconds
- [ ] Warm start < 1 second
- [ ] Splash screen displays correctly
- [ ] No crashes on launch

### Memory & CPU

- [ ] No memory leaks (test with Instruments/Profiler)
- [ ] Memory usage < 200MB during normal use
- [ ] CPU usage reasonable during idle
- [ ] No excessive battery drain

### Network & Offline

- [ ] App works with WiFi
- [ ] App works with cellular data
- [ ] Graceful degradation in offline mode
- [ ] Network errors show helpful messages
- [ ] Data syncs when connection restored

### Stability

- [ ] No crashes during 10-minute session
- [ ] No crashes during onboarding
- [ ] No crashes during meal logging
- [ ] No crashes during subscription flow
- [ ] No crashes when toggling dark mode
- [ ] No crashes when rotating device (if supported)

---

## App Store Requirements

### iOS App Store

#### App Store Connect Configuration

- [ ] App created in App Store Connect
- [ ] Bundle ID matches production (`com.calton24.caloric`)
- [ ] App Store Connect app ID is `6761738426`
- [ ] Team ID is correct (`93HBV58WBY`)
- [ ] Pricing set (Free with IAP)
- [ ] Availability set (all regions or specific)

#### App Metadata

- [ ] App name: "Caloric" (or approved name)
- [ ] Subtitle/tagline written
- [ ] Description written (4000 char max)
- [ ] Keywords selected (100 char max)
- [ ] Promotional text written (170 char)
- [ ] Support URL set
- [ ] Marketing URL set (optional)
- [ ] Privacy Policy URL set

#### Screenshots & Media

- [ ] 6.7" iPhone screenshots (3+)
- [ ] 6.5" iPhone screenshots (3+)
- [ ] 5.5" iPhone screenshots (3+)
- [ ] iPad Pro 12.9" screenshots (3+)
- [ ] App Preview video (optional but recommended)
- [ ] All screenshots show current UI (no outdated)

#### Privacy Nutrition Label

- [ ] Data collection practices listed
- [ ] Email address (if collected)
- [ ] Name (if collected)
- [ ] Health & Fitness data (meals, weight)
- [ ] Usage data (analytics)
- [ ] Diagnostics (crash reports)
- [ ] Data linked to user: Correctly declared
- [ ] Data used for tracking: Correctly declared

#### Age Rating

- [ ] Age rating questionnaire completed
- [ ] Rating matches content (likely 4+)
- [ ] No inappropriate content warnings

#### Review Information

- [ ] Demo account credentials provided (if required)
- [ ] Review notes written (special instructions)
- [ ] Contact information correct

### Google Play Store

#### Google Play Console Configuration

- [ ] App created in Google Play Console
- [ ] Package name matches (`com.calton24.caloric`)
- [ ] App signed with production keystore
- [ ] Pricing set (Free with IAP)
- [ ] Availability set (all regions or specific)

#### App Metadata

- [ ] App name: "Caloric"
- [ ] Short description (80 char)
- [ ] Full description (4000 char)
- [ ] App category selected
- [ ] Support email set
- [ ] Privacy Policy URL set

#### Screenshots & Media

- [ ] Phone screenshots (2+ required, 8 max)
- [ ] 7" Tablet screenshots (optional but recommended)
- [ ] 10" Tablet screenshots (optional but recommended)
- [ ] Feature graphic (1024x500)
- [ ] App icon (512x512)
- [ ] Promo video (YouTube URL, optional)

#### Data Safety Form

- [ ] Data collection practices declared
- [ ] Personal information: Email, Name
- [ ] Health & Fitness: Meals, Weight, Activity
- [ ] App activity: Analytics
- [ ] App diagnostics: Crash logs
- [ ] Data sharing: None (or declared if applicable)
- [ ] Data deletion: Account deletion available
- [ ] Data encryption: Yes (in transit and at rest)

#### Age Rating

- [ ] Content rating questionnaire completed
- [ ] Rating matches content
- [ ] ESRB, PEGI, etc. ratings generated

#### Review Information

- [ ] Test account provided (if required)
- [ ] Special instructions for reviewers

---

## Final Pre-Submission Checks

### Documentation

- [ ] README.md updated
- [ ] CHANGELOG.md created/updated
- [ ] Release notes written for this version
- [ ] Known issues documented

### Code Quality

- [ ] No TypeScript errors (`npm run check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] All tests passing (`npm run test`)
- [ ] E2E tests passing (`npm run e2e`)
- [ ] Security audit passing (`npm run caloric:security`)

### Version Control

- [ ] All changes committed to Git
- [ ] Tagged with version number (e.g., `v1.0.0`)
- [ ] Pushed to main/production branch
- [ ] No uncommitted changes

### Team Review

- [ ] Code review completed
- [ ] Design review completed
- [ ] Product review completed
- [ ] Legal review completed (if required)

### Final Submission

- [ ] **iOS:** Build uploaded to TestFlight
- [ ] **iOS:** TestFlight build approved for external testing
- [ ] **iOS:** Submitted for App Store review
- [ ] **Android:** APK/AAB uploaded to Play Console
- [ ] **Android:** Internal testing completed
- [ ] **Android:** Submitted for Google Play review

---

## Post-Submission

### Monitor

- [ ] Check App Store Connect for review status
- [ ] Check Google Play Console for review status
- [ ] Monitor Sentry for production crashes
- [ ] Monitor PostHog for usage patterns
- [ ] Monitor RevenueCat for subscription metrics

### Communication

- [ ] Notify team of submission
- [ ] Prepare launch communications
- [ ] Prepare support docs/FAQs
- [ ] Set up customer support email

---

## Sign-Off

| Role                 | Name             | Date     | Signature  |
| -------------------- | ---------------- | -------- | ---------- |
| **QA Lead**          | ****\_\_\_\_**** | **\_\_** | ****\_**** |
| **Engineering Lead** | ****\_\_\_\_**** | **\_\_** | ****\_**** |
| **Product Manager**  | ****\_\_\_\_**** | **\_\_** | ****\_**** |
| **Legal/Compliance** | ****\_\_\_\_**** | **\_\_** | ****\_**** |

---

**Status Codes:**

- 🔴 Not Started
- 🟡 In Progress
- 🟢 Completed
- ⚠️ Blocked/Issue Found

**Notes:**
_Use this section for any additional notes, issues found, or special instructions._

---

**Document Owner:** QA Team  
**Last Review:** April 11, 2026  
**Next Review:** Before each major release
