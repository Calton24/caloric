export type FoodLogStoreApplyQueueEntry = {
  transactionId: string;
  mealId: string;
};

let queued: FoodLogStoreApplyQueueEntry | null = null;

export function queueFoodLogStoreApply(entry: FoodLogStoreApplyQueueEntry) {
  queued = entry;
}

/** Non-null only once per queue; clears slot. */
export function consumeFoodLogStoreApply(): FoodLogStoreApplyQueueEntry | null {
  const q = queued;
  queued = null;
  return q;
}

export function peekFoodLogStoreApply(): FoodLogStoreApplyQueueEntry | null {
  return queued;
}
