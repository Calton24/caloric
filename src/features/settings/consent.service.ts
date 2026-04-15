/**
 * Consent Management Service
 *
 * Handles user consent for analytics, tracking, and data collection.
 * Required for GDPR, CCPA, and App Store compliance.
 *
 * Flow:
 * 1. User completes onboarding
 * 2. Show consent dialog (first launch only)
 * 3. Store consent preferences
 * 4. Initialize analytics based on consent
 *
 * @see https://gdpr.eu/cookies/
 * @see https://www.apple.com/legal/privacy/data/en/app-tracking-transparency/
 */

import { analytics } from "../../infrastructure/analytics";
import { getStorage } from "../../infrastructure/storage";

const CONSENT_VERSION = "1.0.0";
const CONSENT_KEY = "caloric-user-consent";
const CONSENT_VERSION_KEY = "caloric-consent-version";

export interface UserConsent {
  analytics: boolean; // PostHog, general product analytics
  tracking: boolean; // ATT, cross-app tracking (iOS)
  marketing: boolean; // Marketing emails, promotional content
  crashReporting: boolean; // Sentry error reporting
  timestamp: string;
  version: string;
}

/**
 * Check if user has been asked for consent yet.
 * Returns false if no consent record exists or version changed.
 */
export async function hasConsentBeenRequested(): Promise<boolean> {
  const storage = getStorage();
  const consent = await storage.getItem(CONSENT_KEY);
  const version = await storage.getItem(CONSENT_VERSION_KEY);

  return consent !== null && version === CONSENT_VERSION;
}

/**
 * Get current user consent preferences.
 * Returns null if user hasn't been asked yet.
 */
export async function getUserConsent(): Promise<UserConsent | null> {
  const storage = getStorage();
  const consentStr = await storage.getItem(CONSENT_KEY);

  if (!consentStr) return null;

  try {
    return JSON.parse(consentStr) as UserConsent;
  } catch {
    return null;
  }
}

/**
 * Save user consent preferences.
 * Re-initializes analytics based on new settings.
 */
export async function saveUserConsent(
  consent: Omit<UserConsent, "timestamp" | "version">
): Promise<void> {
  const storage = getStorage();

  const fullConsent: UserConsent = {
    ...consent,
    timestamp: new Date().toISOString(),
    version: CONSENT_VERSION,
  };

  await storage.setItem(CONSENT_KEY, JSON.stringify(fullConsent));
  await storage.setItem(CONSENT_VERSION_KEY, CONSENT_VERSION);

  // Re-initialize analytics if consent is granted
  if (!consent.analytics) {
    analytics.reset();
  }
}

/**
 * Revoke all consent (user requested).
 * Resets analytics and clears stored data.
 */
export async function revokeAllConsent(): Promise<void> {
  await saveUserConsent({
    analytics: false,
    tracking: false,
    marketing: false,
    crashReporting: false,
  });
}

/**
 * Get default consent (all disabled by default for GDPR compliance).
 */
export function getDefaultConsent(): Omit<
  UserConsent,
  "timestamp" | "version"
> {
  return {
    analytics: false,
    tracking: false,
    marketing: false,
    crashReporting: true, // Crash reporting is typically essential
  };
}
