/**
 * LiveActivityModule — JS API
 *
 * Wraps the native LiveActivityModule (Swift) via expo-modules-core.
 * This is the ONLY import consumer code needs.
 *
 * Usage:
 *   import LiveActivityModule from '../../modules/live-activity';
 *   const id = LiveActivityModule.startActivity("name", "title", "value");
 */

import { requireNativeModule } from "expo-modules-core";

// This will throw if the native module isn't available (Android, Expo Go).
// The factory handles the try/catch.
const LiveActivityModule = requireNativeModule("LiveActivityModule");

export default LiveActivityModule;
