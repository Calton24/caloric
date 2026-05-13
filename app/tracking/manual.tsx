/**
 * Legacy URL `/tracking/manual` — forwards to home so the FAB-style
 * bottom sheet (`ManualLogSheet`) opens (same as the "+" keyboard path).
 */

import { Redirect, type Href } from "expo-router";

const MANUAL_HOME: Href = {
  pathname: "/(tabs)",
  params: { foodLog: "manual" },
};

export default function TrackingManualRedirect() {
  return <Redirect href={MANUAL_HOME} />;
}
