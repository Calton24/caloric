/**
 * Live Activity Feature — Types
 *
 * App-side payload shape that the sync hook derives from stores
 * and feeds to the native CalorieBudgetActivity bridge.
 */

export interface LiveActivityPayload {
  caloriesConsumed: number;
  calorieBudget: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 0..1 progress ratio */
  progress: number;
}
