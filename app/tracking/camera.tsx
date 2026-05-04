/**
 * Camera Logging Screen (tracking tab route)
 */

import { Redirect } from "expo-router";
import { CAMERA_LOG_ROUTE } from "../../src/features/food-logging/food-logging-routes";

/**
 * Re-exports the modal camera screen. The tracking tab's camera button
 * now routes to `CAMERA_LOG_ROUTE` (`/(modals)/camera-log`); this file
 * exists for backward compatibility with `/tracking/camera`.
 */
export default function CameraRedirect() {
  return <Redirect href={CAMERA_LOG_ROUTE} />;
}
