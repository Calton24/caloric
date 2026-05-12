/**
 * Post–food-log window: suppress heavy store reactions until the meal is
 * applied to the nutrition store and interactions have settled.
 */

let settlingUntilMs = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* noop */
    }
  }
}

export function subscribePostFoodLogSettling(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getPostFoodLogSettlingSnapshot(): boolean {
  return Date.now() < settlingUntilMs;
}

/**
 * Begin settling (e.g. before queueing modal exit or before addMeal in apply).
 */
export function startPostFoodLogSettling(extendMs = 2500) {
  settlingUntilMs = Date.now() + extendMs;
  notify();
}

export function extendPostFoodLogSettling(extendMs: number) {
  settlingUntilMs = Math.max(settlingUntilMs, Date.now() + extendMs);
  notify();
}

export function endPostFoodLogSettling() {
  settlingUntilMs = 0;
  notify();
}

export function isPostFoodLogSettling(): boolean {
  return getPostFoodLogSettlingSnapshot();
}
