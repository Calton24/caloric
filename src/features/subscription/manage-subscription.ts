/**
 * Manage Subscription launcher
 *
 * iOS-first flow:
 *   1) Try native bridge (if available): openManageSubscriptions()
 *   2) Fallback to App Store subscription URL
 *
 * Android:
 *   - Fallback to Play Store subscriptions URL
 *
 * Notes:
 * - Native bridge is optional. If a Swift module is added later, expose:
 *     NativeModules.ManageSubscriptions.openManageSubscriptions()
 * - This helper never throws to callers.
 */

import { Linking, NativeModules, Platform } from "react-native";

type OpenResult = "native" | "fallback" | "failed";

const IOS_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";
const ANDROID_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions";

function getNativeOpeners(): Array<(() => Promise<unknown>) | null> {
  const modules = [
    NativeModules?.ManageSubscriptions,
    NativeModules?.SubscriptionManager,
    NativeModules?.AppStoreSubscriptions,
  ];

  return modules.map((m) =>
    typeof m?.openManageSubscriptions === "function"
      ? () => m.openManageSubscriptions()
      : null
  );
}

async function openFallback(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens subscription management UI.
 * Returns which path succeeded ("native" | "fallback" | "failed").
 */
export async function openManageSubscriptions(): Promise<OpenResult> {
  try {
    if (Platform.OS === "ios") {
      const nativeOpeners = getNativeOpeners().filter(
        (fn): fn is () => Promise<unknown> => fn != null
      );

      if (nativeOpeners.length > 0) {
        for (const openNative of nativeOpeners) {
          try {
            await openNative();
            console.log("[ManageSubscription] opened");
            return "native";
          } catch {
            console.log("[ManageSubscription] native sheet unavailable");
          }
        }
      } else {
        console.log("[ManageSubscription] native sheet unavailable");
      }

      const openedFallback = await openFallback(IOS_SUBSCRIPTIONS_URL);
      if (openedFallback) {
        console.log("[ManageSubscription] fallback opened");
        return "fallback";
      }

      console.log("[ManageSubscription] failed");
      return "failed";
    }

    // Android / other platforms: fallback-only for now.
    const androidOpened = await openFallback(ANDROID_SUBSCRIPTIONS_URL);
    if (androidOpened) {
      console.log("[ManageSubscription] fallback opened");
      return "fallback";
    }

    console.log("[ManageSubscription] failed");
    return "failed";
  } catch {
    console.log("[ManageSubscription] failed");
    return "failed";
  }
}

