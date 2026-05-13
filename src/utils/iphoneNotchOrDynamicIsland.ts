import * as Device from "expo-device";
import { Platform } from "react-native";

/** iPhone SE (home button / no notch) — hardware `modelId` forms. */
const IPHONE_SE_MODEL_IDS = new Set([
  "iPhone8,4",
  "iPhone12,8",
  "iPhone14,6",
]);

function notchOrIslandFromModelId(modelId: string): boolean | null {
  const m = /^iPhone(\d+),(\d+)$/i.exec(modelId.trim());
  if (!m) return null;
  if (IPHONE_SE_MODEL_IDS.has(modelId)) return false;

  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  if (Number.isNaN(major) || Number.isNaN(minor)) return null;

  // iPhone X
  if (major === 10) return minor === 3 || minor === 6;
  // iPhone 11 … (includes all sizes; SE ids excluded above)
  if (major >= 11) return true;
  return false;
}

function notchOrIslandFromModelName(name: string): boolean {
  if (!name.startsWith("iPhone")) return false;
  if (/iPhone SE/i.test(name)) return false;
  if (
    /\biPhone X\b/i.test(name) ||
    /\biPhone XS\b/i.test(name) ||
    /\biPhone XR\b/i.test(name)
  ) {
    return true;
  }
  const digitMatch = name.match(/iPhone (\d+)/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (!Number.isNaN(n) && n >= 11) return true;
  }
  return false;
}

/**
 * True on iPhones with a notch or Dynamic Island (excludes SE-class phones).
 * Used to gate Live Activities settings that do not apply to home-button iPhones.
 *
 * Kept under `src/utils/` (not `src/.../ios/`) so `.gitignore`'s `ios/` rule
 * for the native Xcode project does not exclude this file from git.
 */
export function iosPhoneHasNotchOrDynamicIsland(): boolean {
  if (Platform.OS !== "ios") return false;
  if (Device.deviceType !== Device.DeviceType.PHONE) return false;

  const modelId =
    typeof Device.modelId === "string" ? Device.modelId.trim() : "";
  if (modelId) {
    const fromId = notchOrIslandFromModelId(modelId);
    if (fromId !== null) return fromId;
  }

  const modelName = Device.modelName ?? "";
  return notchOrIslandFromModelName(modelName);
}
