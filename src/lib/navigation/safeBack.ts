import { router } from "expo-router";

/**
 * Navigate back if there is history, otherwise replace with the fallback route.
 *
 * Prevents the "GO_BACK was not handled by any navigator" warning that fires
 * when a screen is opened as the root of the navigation stack (e.g. a deep
 * link, a rapid double-push that resolves with no prior history, or a cold
 * start directly to a modal).
 */
export function safeBack(fallback: string = "/(tabs)"): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as Parameters<typeof router.replace>[0]);
  }
}
