/**
 * @deprecated Meal log reminders are toggled from Settings or the home menu.
 * Deep links here redirect to the main settings screen.
 */

import { Redirect } from "expo-router";

export default function NotificationsSettingsRedirect() {
  return <Redirect href="/(main)/settings" />;
}
