/**
 * Experiments Module
 *
 * A/B testing infrastructure for CTA and copy optimization.
 *
 * @example
 * ```tsx
 * import {
 *   useExperiment,
 *   getWelcomeCtaCopy,
 *   trackExperimentExposure,
 *   trackExperimentClick,
 * } from "@/experiments";
 *
 * function WelcomeScreen() {
 *   const variant = useExperiment("welcome_cta_v1");
 *   const locale = i18n.language;
 *
 *   const ctaCopy = variant
 *     ? getWelcomeCtaCopy(locale, variant)
 *     : t("welcome.cta"); // fallback while loading
 *
 *   useEffect(() => {
 *     if (variant) {
 *       trackExperimentExposure({
 *         experiment: "welcome_cta_v1",
 *         variant,
 *         locale,
 *         screen: "welcome",
 *       });
 *     }
 *   }, [variant]);
 *
 *   return <Button onPress={handlePress}>{ctaCopy}</Button>;
 * }
 * ```
 */

// Config & types
export {
    EXPERIMENTS,
    EXPERIMENT_META, type ExperimentAssignments, type ExperimentKey,
    type Variant
} from "./experiments";

// Assignment
export {
    clearAllAssignments, forceVariant, getAllAssignments, getExperimentVariant,
    getExperimentVariantSync, isVariantForced, preloadExperimentAssignments
} from "./experiment-assignment";

// Hooks
export { useExperiment, useExperiments } from "./useExperiment";

// Copy
export {
    getPaywallCtaCopy, getWelcomeCtaCopy, type SupportedLocale
} from "./experiment-copy";

// Analytics
export {
    createExperimentProps, trackExperimentClick,
    trackExperimentConversion, trackExperimentExposure
} from "./experiment-analytics";

