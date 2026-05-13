/**
 * Apple Health — HealthKit Implementation (iOS only)
 *
 * Wraps react-native-health to provide read/write access to:
 *   - Body Mass (weight)
 *   - Dietary Energy (calories)
 *
 * Only instantiated on iOS when HealthKit is available.
 */

import type { HealthKitPermissions, HealthValue } from "react-native-health";

import type {
    HealthKitNutritionSample,
    HealthKitWeightSample,
    HealthService,
    WriteDietaryEnergySampleInput,
} from "./health.types";

// Lazy-load the native module to avoid crashes when not linked.
// react-native-health does Object.assign({}, NativeModules.AppleHealthKit, ...)
// but that can't copy methods from a Proxy/TurboModule, so we also try
// accessing the native module directly as a fallback.
let _hk: any = null;
function getHK() {
  if (!_hk) {
    let jsWrapper: any = null;
    try {
      jsWrapper = require("react-native-health");
      if (jsWrapper && jsWrapper.default) jsWrapper = jsWrapper.default;
      if (jsWrapper && jsWrapper.HealthKit) jsWrapper = jsWrapper.HealthKit;
    } catch {
      jsWrapper = null;
    }

    // If the JS wrapper has native methods, use it as-is
    if (jsWrapper?.isAvailable) {
      _hk = jsWrapper;
    } else {
      // Fallback: grab the native module directly (handles Proxy-based NativeModules)
      try {
        const { NativeModules } = require("react-native");
        const native = NativeModules?.AppleHealthKit;
        if (native) {
          // Merge: use native module for methods, JS wrapper for Constants
          _hk = Object.create(native, {
            Constants: {
              value: jsWrapper?.Constants ?? {},
              enumerable: true,
            },
          });
        } else {
          _hk = jsWrapper; // best effort — may be null
        }
      } catch {
        _hk = jsWrapper;
      }
    }

    if (_hk && !_hk?.isAvailable) {
      console.warn(
        "[HealthKit] Native module not found. Rebuild your development client."
      );
    }
  }
  return _hk;
}

function getPermissions(): HealthKitPermissions {
  const hk = getHK();
  const perms = hk?.Constants?.Permissions;
  return {
    permissions: {
      read: [
        perms?.Weight ?? "Weight",
        perms?.EnergyConsumed ?? "EnergyConsumed",
      ],
      write: [
        perms?.Weight ?? "Weight",
        perms?.EnergyConsumed ?? "EnergyConsumed",
      ],
    },
  };
}

function promisify<T>(
  fn: (opts: any, cb: (err: string, results: T) => void) => void,
  opts: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(opts, (err, results) => {
      if (err) reject(new Error(err));
      else resolve(results);
    });
  });
}

export class AppleHealthService implements HealthService {
  private initialized = false;

  async isAvailable(): Promise<boolean> {
    const hk = getHK();
    if (!hk?.isAvailable) return false;
    return new Promise((resolve) => {
      hk.isAvailable((err: object, available: boolean) => {
        resolve(!err && available);
      });
    });
  }

  async requestPermissions(opts: {
    read: boolean;
    write: boolean;
  }): Promise<boolean> {
    const hk = getHK();
    if (!hk?.initHealthKit) return false;

    const allPerms = getPermissions();
    const perms: HealthKitPermissions = {
      permissions: {
        read: opts.read ? allPerms.permissions.read : [],
        write: opts.write ? allPerms.permissions.write : [],
      },
    };

    return new Promise((resolve) => {
      hk.initHealthKit(perms, (err: string) => {
        if (err) {
          resolve(false);
          return;
        }
        this.initialized = true;
        resolve(true);
      });
    });
  }

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    await this.requestPermissions({ read: true, write: true });
  }

  async readWeightSamples(
    startDate: Date,
    endDate: Date
  ): Promise<HealthKitWeightSample[]> {
    await this.ensureInit();
    const hk = getHK();
    if (!hk?.getWeightSamples) return [];

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
      unit: hk.Constants?.Units?.pound ?? "pound",
    };

    const samples = await promisify<HealthValue[]>(
      hk.getWeightSamples.bind(hk),
      options
    );

    return samples.map((s) => ({
      startDate: s.startDate,
      value: s.value,
      sourceName: (s as unknown as Record<string, unknown>).sourceName as
        | string
        | undefined,
    }));
  }

  async writeWeight(weightLbs: number, date: Date): Promise<void> {
    await this.ensureInit();
    const hk = getHK();
    if (!hk?.saveWeight) return;

    return new Promise((resolve, reject) => {
      hk.saveWeight(
        { value: weightLbs, unit: hk.Constants?.Units?.pound ?? "pound" },
        (err: string) => {
          if (err) reject(new Error(err));
          else resolve();
        }
      );
    });
  }

  async readCalorieSamples(
    startDate: Date,
    endDate: Date
  ): Promise<HealthKitNutritionSample[]> {
    await this.ensureInit();
    const hk = getHK();
    if (!hk?.getEnergyConsumedSamples) return [];

    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    const samples = await promisify<HealthValue[]>(
      hk.getEnergyConsumedSamples.bind(hk),
      options
    );

    return samples.map((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      value: s.value,
    }));
  }

  async writeCalories(input: WriteDietaryEnergySampleInput): Promise<void> {
    await this.ensureInit();
    const hk = getHK();
    if (!hk?.saveFood) return;

    const foodName = String(input.foodName ?? "").trim() || "Food";
    const mealType = String(input.mealType ?? "").trim() || "Lunch";
    const energy = Number(input.energyKcal);
    if (!Number.isFinite(energy) || energy <= 0) return;

    const when = input.date instanceof Date && !Number.isNaN(input.date.getTime())
      ? input.date
      : new Date();
    const dateIso = when.toISOString();

    // Keys MUST match RCTAppleHealthKit+Methods_Dietary.m `saveFood:`.
    // Native builds @{ HKMetadataKeyFoodType: foodName, @"HKFoodMeal": mealType }
    // — both must be non-nil NSString or the app crashes (NSDictionary literal).
    const nativeInput: Record<string, string | number> = {
      foodName,
      mealType,
      energy,
      date: dateIso,
    };

    const p = input.proteinG != null ? Number(input.proteinG) : 0;
    const c = input.carbohydratesG != null ? Number(input.carbohydratesG) : 0;
    const f = input.fatG != null ? Number(input.fatG) : 0;
    if (Number.isFinite(p) && p > 0) nativeInput.protein = p;
    if (Number.isFinite(c) && c > 0) nativeInput.carbohydrates = c;
    if (Number.isFinite(f) && f > 0) nativeInput.fatTotal = f;

    return new Promise((resolve, reject) => {
      try {
        hk.saveFood(
          nativeInput,
          (err: string, _result: HealthValue) => {
            if (err) reject(new Error(String(err)));
            else resolve();
          }
        );
      } catch (e) {
        reject(
          e instanceof Error
            ? e
            : new Error("HealthKit saveFood threw synchronously")
        );
      }
    });
  }
}
