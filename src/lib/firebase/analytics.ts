/**
 * Firebase Analytics Wrapper
 * Safe wrapper with no-op behavior when Firebase is disabled
 */

import { getAnalytics } from "./init";

/**
 * Track a custom event with optional parameters
 * No-op if Firebase Analytics is disabled
 *
 * @param eventName - Name of the event (max 40 chars, alphanumeric + underscore)
 * @param params - Optional event parameters (max 25 params, max 100 chars per value)
 *
 * @example
 * trackEvent('food_scanned', {
 *   food_type: 'apple',
 *   calories: 95,
 *   meal_time: 'breakfast'
 * });
 */
export async function trackEvent(
  eventName: string,
  params?: { [key: string]: any },
): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    // No-op when disabled
    return;
  }

  try {
    await analytics.logEvent(eventName, params);
    console.log(`[Analytics] Event tracked: ${eventName}`, params);
  } catch (error) {
    console.error(`[Analytics] Failed to track event ${eventName}:`, error);
  }
}

/**
 * Set the current user ID for analytics
 * Helps track user behavior across sessions
 * No-op if Firebase Analytics is disabled
 *
 * @param userId - Unique user identifier (or null to clear)
 *
 * @example
 * setUserId('user_abc123');
 */
export async function setUserId(userId: string | null): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    return;
  }

  try {
    await analytics.setUserId(userId);
    console.log(`[Analytics] User ID set:`, userId);
  } catch (error) {
    console.error("[Analytics] Failed to set user ID:", error);
  }
}

/**
 * Set custom user properties for segmentation
 * Max 25 properties, max 36 chars per value
 * No-op if Firebase Analytics is disabled
 *
 * @param properties - Object with user properties
 *
 * @example
 * setUserProperties({
 *   subscription_tier: 'premium',
 *   signup_date: '2024-01-15',
 *   preferred_language: 'en'
 * });
 */
export async function setUserProperties(properties: {
  [key: string]: string | null;
}): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    return;
  }

  try {
    await analytics.setUserProperties(properties);
    console.log("[Analytics] User properties set:", properties);
  } catch (error) {
    console.error("[Analytics] Failed to set user properties:", error);
  }
}

/**
 * Log a screen view event
 * Automatically tracked by React Navigation in many cases
 * No-op if Firebase Analytics is disabled
 *
 * @param screenName - Name of the screen
 * @param screenClass - Optional screen class/component name
 *
 * @example
 * logScreenView('HomeScreen', 'Home');
 */
export async function logScreenView(
  screenName: string,
  screenClass?: string,
): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    return;
  }

  try {
    await analytics.logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
    console.log(`[Analytics] Screen view: ${screenName}`);
  } catch (error) {
    console.error("[Analytics] Failed to log screen view:", error);
  }
}

/**
 * Track app open event (useful for attribution)
 * No-op if Firebase Analytics is disabled
 */
export async function logAppOpen(): Promise<void> {
  return trackEvent("app_open");
}

/**
 * Set whether analytics collection is enabled
 * Useful for GDPR compliance
 *
 * @param enabled - Whether to enable analytics collection
 */
export async function setAnalyticsCollectionEnabled(
  enabled: boolean,
): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    return;
  }

  try {
    await analytics.setAnalyticsCollectionEnabled(enabled);
    console.log(`[Analytics] Collection ${enabled ? "enabled" : "disabled"}`);
  } catch (error) {
    console.error("[Analytics] Failed to set collection enabled:", error);
  }
}

/**
 * Reset analytics data (useful for testing)
 * Clears user ID and properties
 * No-op if Firebase Analytics is disabled
 */
export async function resetAnalyticsData(): Promise<void> {
  const analytics = getAnalytics();

  if (!analytics) {
    return;
  }

  try {
    await analytics.resetAnalyticsData();
    console.log("[Analytics] Data reset");
  } catch (error) {
    console.error("[Analytics] Failed to reset data:", error);
  }
}

// Common pre-defined events for convenience

/**
 * Track a login event
 */
export async function logLogin(method: string): Promise<void> {
  return trackEvent("login", { method });
}

/**
 * Track a signup event
 */
export async function logSignUp(method: string): Promise<void> {
  return trackEvent("sign_up", { method });
}

/**
 * Track a purchase event
 */
export async function logPurchase(
  value: number,
  currency: string,
  items?: any[],
): Promise<void> {
  return trackEvent("purchase", {
    value,
    currency,
    items,
  });
}

/**
 * Track a search event
 */
export async function logSearch(searchTerm: string): Promise<void> {
  return trackEvent("search", { search_term: searchTerm });
}

/**
 * Track content selection
 */
export async function logSelectContent(
  contentType: string,
  itemId: string,
): Promise<void> {
  return trackEvent("select_content", {
    content_type: contentType,
    item_id: itemId,
  });
}
