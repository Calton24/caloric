import { Redirect } from "expo-router";

/**
 * Catch-all for unmatched routes (e.g. expired auth deep links, bad URLs).
 * Redirects to the index which handles auth-based routing.
 * Prevents the default Expo Router sitemap from being exposed.
 */
export default function NotFoundScreen() {
  return <Redirect href="/" />;
}
