/**
 * Apple Health Integration — Types
 */

export interface HealthKitWeightSample {
  /** ISO date string */
  startDate: string;
  /** Weight in pounds */
  value: number;
  /** Source name (e.g. "Caloric", "Withings", "Apple Watch") */
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

  /** Write dietary energy (calories) to HealthKit */
  writeCalories(
    calories: number,
    startDate: Date,
    endDate: Date
  ): Promise<void>;
}
