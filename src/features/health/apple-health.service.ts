/**
 * Apple Health — HealthKit Implementation (iOS only)
 *
 * Wraps react-native-health to provide read/write access to:
 *   - Body Mass (weight)
 *   - Dietary Energy (calories)
 *
 * Only instantiated on iOS when HealthKit is available.
 */

import AppleHealthKit, {
    HealthInputOptions,
    HealthKitPermissions,
    HealthValue,
} from "react-native-health";

import type {
    HealthKitNutritionSample,
    HealthKitWeightSample,
    HealthService,
} from "./health.types";

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.DietaryEnergyConsumed,
    ],
  },
};

function promisify<T>(
  fn: (opts: HealthInputOptions, cb: (err: string, results: T) => void) => void,
  opts: HealthInputOptions
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
    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((err: object, available: boolean) => {
        resolve(!err && available);
      });
    });
  }

  async requestPermissions(opts: {
    read: boolean;
    write: boolean;
  }): Promise<boolean> {
    const perms: HealthKitPermissions = {
      permissions: {
        read: opts.read ? PERMISSIONS.permissions.read : [],
        write: opts.write ? PERMISSIONS.permissions.write : [],
      },
    };

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(perms, (err: string) => {
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

    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
      unit: "pound",
    };

    const samples = await promisify<HealthValue[]>(
      AppleHealthKit.getWeightSamples.bind(AppleHealthKit),
      options
    );

    return samples.map((s) => ({
      startDate: s.startDate,
      value: s.value,
      sourceName: (s as Record<string, unknown>).sourceName as
        | string
        | undefined,
    }));
  }

  async writeWeight(weightLbs: number, date: Date): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      AppleHealthKit.saveWeight(
        { value: weightLbs, unit: "pound" },
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

    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
    };

    const samples = await promisify<HealthValue[]>(
      AppleHealthKit.getEnergyConsumedSamples.bind(AppleHealthKit),
      options
    );

    return samples.map((s) => ({
      startDate: s.startDate,
      endDate: s.endDate,
      value: s.value,
    }));
  }

  async writeCalories(
    calories: number,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    await this.ensureInit();

    return new Promise((resolve, reject) => {
      AppleHealthKit.saveFood(
        {
          foodName: "Caloric Meal",
          value: calories,
          startDate: startDate.toISOString(),
          // roact-native-health types don't expose all options, cast
        } as Record<string, unknown>,
        (err: Object, _result: HealthValue) => {
          if (err) reject(new Error(String(err)));
          else resolve();
        }
      );
    });
  }
}
