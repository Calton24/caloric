export type FoodLogCommittedPayload = {
  mealId: string;
  transactionId: string;
};

const listeners = new Set<(payload: FoodLogCommittedPayload) => void>();

export function emitFoodLogCommitted(payload: FoodLogCommittedPayload) {
  for (const listener of listeners) {
    try {
      listener(payload);
    } catch {
      // Listener errors must not break other subscribers or the food-log flow.
    }
  }
}

export function subscribeFoodLogCommitted(
  listener: (payload: FoodLogCommittedPayload) => void
) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
