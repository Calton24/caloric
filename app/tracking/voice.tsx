/**
 * Legacy URL `/tracking/voice` — forwards to home so the FAB-style
 * bottom sheet (`VoiceLogSheet`) opens (same as the "+" mic path).
 */

import { Redirect, type Href } from "expo-router";

const VOICE_HOME: Href = {
  pathname: "/(tabs)",
  params: { foodLog: "voice" },
};

export default function TrackingVoiceRedirect() {
  return <Redirect href={VOICE_HOME} />;
}
