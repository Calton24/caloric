/**
 * Canonical routes for AI camera food logging (TestFlight / release gate).
 *
 * - **`CAMERA_LOG_ROUTE`** (`/(modals)/camera-log`) — primary camera capture screen (modal stack).
 * - **Legacy `/tracking/camera`** (`app/tracking/camera.tsx`) — compatibility redirect to `CAMERA_LOG_ROUTE`.
 * - **`meal-analysis`** (`app/(modals)/meal-analysis.tsx`) — registered in the modal stack but not wired
 *   from the camera pipeline (reserved / future; confirm flow uses `/(modals)/confirm-meal`).
 *
 * Two tracking launcher hubs exist (`app/(modals)/tracking.tsx`, `app/tracking/index.tsx`); both should
 * navigate to **`CAMERA_LOG_ROUTE`** for Scan — avoid duplicating raw path strings.
 */

export const CAMERA_LOG_ROUTE = "/(modals)/camera-log" as const;
