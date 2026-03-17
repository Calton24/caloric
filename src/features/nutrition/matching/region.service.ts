/**
 * Region Detection Service
 *
 * Resolves the user's food-database region from:
 *   1. Explicit user override (persisted in AsyncStorage)
 *   2. Device locale / country code (via expo-localization)
 *   3. Fallback to "gb" (UK/Europe-first default)
 *
 * Used to route Open Food Facts queries to the correct regional
 * endpoint and to prioritise region-relevant results.
 */

import { logger } from "../../../logging/logger";

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "caloric_food_region";
const DEFAULT_REGION = "gb";

/**
 * Country codes that map to known Open Food Facts regional subdomains.
 * Used to validate region codes before passing to the OFF service.
 */
const VALID_REGIONS = new Set([
  "gb",
  "uk",
  "ie",
  "fr",
  "de",
  "nl",
  "be",
  "lu",
  "at",
  "ch",
  "es",
  "it",
  "pt",
  "gr",
  "pl",
  "cz",
  "sk",
  "hu",
  "ro",
  "bg",
  "hr",
  "si",
  "se",
  "dk",
  "fi",
  "no",
  "us",
  "ca",
  "br",
  "mx",
  "au",
  "in",
  "jp",
]);

// ─── Dynamic requires (optional deps) ───────────────────────────────────────

let Localization: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Localization = require("expo-localization");
} catch {
  Localization = null;
}

let AsyncStorage: any = null;
try {
  AsyncStorage =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-async-storage/async-storage").default ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-async-storage/async-storage");
} catch {
  AsyncStorage = null;
}

// ─── State ───────────────────────────────────────────────────────────────────

let cachedRegion: string | null = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the country/region code from the device locale.
 *
 * expo-localization returns objects like:
 *   { languageTag: "en-GB", languageCode: "en", regionCode: "GB" }
 *
 * We want the regionCode (country), lowercased.
 */
function detectDeviceRegion(): string {
  try {
    if (Localization?.getLocales) {
      const locales = Localization.getLocales();
      if (Array.isArray(locales) && locales.length > 0) {
        // regionCode is the ISO 3166-1 country code (e.g. "GB", "PL", "ES")
        const regionCode = locales[0].regionCode;
        if (regionCode) {
          const code = regionCode.toLowerCase();
          if (VALID_REGIONS.has(code)) return code;
          // "uk" alias
          if (code === "uk") return "gb";
        }
      }
    }
  } catch {
    // Non-fatal — fall through to default
  }
  return DEFAULT_REGION;
}

async function loadStoredRegion(): Promise<string | null> {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the user's food region code.
 *
 * Resolution order:
 *   1. In-memory cache (fastest — avoids async on hot path)
 *   2. Persisted user override (AsyncStorage)
 *   3. Device locale detection (expo-localization)
 *   4. Default: "gb"
 */
export async function getFoodRegion(): Promise<string> {
  if (cachedRegion) return cachedRegion;

  const stored = await loadStoredRegion();
  if (stored && VALID_REGIONS.has(stored)) {
    cachedRegion = stored;
    logger.log(`[region] loaded persisted region: ${stored}`);
    return stored;
  }

  const detected = detectDeviceRegion();
  cachedRegion = detected;
  logger.log(`[region] detected device region: ${detected}`);
  return detected;
}

/**
 * Synchronous version — returns cached region or default.
 * Use this on hot paths where async is not feasible.
 * Call `getFoodRegion()` at least once during app init to warm the cache.
 */
export function getFoodRegionSync(): string {
  return cachedRegion ?? DEFAULT_REGION;
}

/**
 * Set a user-chosen region override.
 * Persisted to AsyncStorage so it survives app restarts.
 */
export async function setFoodRegion(region: string): Promise<void> {
  const code = region.toLowerCase();
  if (!VALID_REGIONS.has(code)) {
    logger.log(`[region] invalid region code: ${code}, ignoring`);
    return;
  }

  cachedRegion = code;

  if (AsyncStorage) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Non-fatal
    }
  }

  logger.log(`[region] set user region: ${code}`);
}

/**
 * Clear the user override — revert to device locale detection.
 */
export async function clearFoodRegion(): Promise<void> {
  cachedRegion = null;

  if (AsyncStorage) {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal
    }
  }

  logger.log("[region] cleared user region override");
}

/**
 * Warm the region cache during app startup.
 * Call this early (e.g., in _layout.tsx or app init) so `getFoodRegionSync()`
 * is available on the hot path.
 */
export async function initFoodRegion(): Promise<string> {
  const region = await getFoodRegion();
  logger.log(`[region] init complete — active region: ${region}`);
  return region;
}
