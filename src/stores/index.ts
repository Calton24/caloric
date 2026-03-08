/**
 * Domain Stores — Barrel Export
 *
 * @deprecated Import directly from src/features/{domain} instead.
 * Re-exports for backward compatibility.
 */

export { useGoalsStore } from "../features/goals";
export { useNutritionStore } from "../features/nutrition";
export {
    usePermissionsStore as usePermissionStore, usePermissionsStore
} from "../features/permissions";
export { useProfileStore } from "../features/profile";
export { useProgressStore } from "../features/progress";
export { useSettingsStore } from "../features/settings";
export {
    useSubscriptionStore as useBillingStore, useSubscriptionStore
} from "../features/subscription";

