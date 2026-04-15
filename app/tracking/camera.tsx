/**
 * Camera Logging Screen (tracking tab route)
 *
 * Re-exports the modal camera screen. The tracking tab's camera button
 * now routes to /(modals)/camera-log, so this exists for backward compat.
 */

import { Redirect } from "expo-router";

export default function CameraRedirect() {
  return <Redirect href="/(modals)/camera-log" />;
}
