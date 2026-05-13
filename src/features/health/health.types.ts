/**
 * Apple Health Integration — Types
 */

export interface HealthKitWeightSample {
  /** ISO date string */
  startDate: string;
  /** Weight in pounds */
  value: number;
  /** Source name (e.g. "CalCut", "Withings", "Apple Watch") */
  sourceName?: string;
}

export interface HealthKitNutritionSample {
  /** ISO date string */
  startDate: string;
  /** End of the sample period */
  endDate: string;
  /** Calorie value */
  value: number;
}

/**
 * Input for HealthKit dietary `saveFood` (react-native-health).
 * Native code requires non-nil `foodName` and `mealType` in metadata.
 */
export interface WriteDietaryEnergySampleInput {
  foodName: string;
  /** HKFoodMeal — must never be omitted (native NSDictionary crashes on nil). */
  mealType: string;
  energyKcal: number;
  /** Consumption instant passed to native as `date`. */
  date: Date;
  proteinG?: number;
  carbohydratesG?: number;
  fatG?: number;
}

export interface HealthService {
  /** Check if HealthKit is available on this device */
  isAvailable(): Promise<boolean>;

  /** Request read/write permissions. Returns true if granted. */
  requestPermissions(opts: { read: boolean; write: boolean }): Promise<boolean>;

  /** Read weight samples from HealthKit within a date range */
  readWeightSamples(
    startDate: Date,
    endDate: Date
  ): Promise<HealthKitWeightSample[]>;

  /** Write a weight sample to HealthKit */
  writeWeight(weightLbs: number, date: Date): Promise<void>;

  /** Read dietary energy (calories) from HealthKit */
  readCalorieSamples(
    startDate: Date,
    endDate: Date
  ): Promise<HealthKitNutritionSample[]>;

  /**
   * Write dietary energy (and optional macros) via react-native-health
   * `saveFood`. Keys must match the native bridge (`foodName`, `mealType`,
   * `energy`, `date`, optional macro keys).
   */
  writeCalories(input: WriteDietaryEnergySampleInput): Promise<void>;
}
