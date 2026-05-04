/**
 * useExperiment — React Hook for A/B Testing
 *
 * Returns the assigned variant for an experiment.
 * Uses synchronous cache when available to prevent CTA flicker.
 *
 * @example
 * ```tsx
 * const variant = useExperiment("welcome_cta_v1");
 * // variant is null during initial load (rare), then "A" or "B"
 * ```
 */

import { useEffect, useMemo, useState } from "react";
import {
    getExperimentVariant,
    getExperimentVariantSync,
} from "./experiment-assignment";
import type { ExperimentKey, Variant } from "./experiments";

/**
 * Get stable experiment variant for the current user.
 * Uses sync cache first to prevent flicker, falls back to async.
 *
 * @param experiment - The experiment key to get variant for
 * @returns Variant ("A" | "B") or null while loading (only on first app launch)
 */
export function useExperiment(experiment: ExperimentKey): Variant | null {
  // Try sync cache first to prevent flicker
  const cachedVariant = getExperimentVariantSync(experiment);
  const [variant, setVariant] = useState<Variant | null>(cachedVariant);

  useEffect(() => {
    // If we already have cached value, no need for async lookup
    if (variant !== null) return;

    let mounted = true;

    getExperimentVariant(experiment).then((v) => {
      if (mounted) setVariant(v);
    });

    return () => {
      mounted = false;
    };
  }, [experiment, variant]);

  return variant;
}

/**
 * Get multiple experiment variants at once.
 * Useful when a component needs to know about several experiments.
 *
 * @param experiments - Array of experiment keys
 * @returns Object mapping experiment keys to variants (null values while loading)
 */
export function useExperiments<K extends ExperimentKey>(
  experiments: K[]
): Record<K, Variant | null> {
  // Memoize the experiments key to avoid complex expression in dependency array
  const experimentsKey = useMemo(() => experiments.join(","), [experiments]);

  const [variants, setVariants] = useState<Record<K, Variant | null>>(() => {
    const initial = {} as Record<K, Variant | null>;
    for (const key of experiments) {
      initial[key] = null;
    }
    return initial;
  });

  useEffect(() => {
    let mounted = true;

    Promise.all(
      experiments.map(async (exp) => ({
        key: exp,
        variant: await getExperimentVariant(exp),
      }))
    ).then((results) => {
      if (!mounted) return;
      const next = {} as Record<K, Variant | null>;
      for (const { key, variant } of results) {
        next[key as K] = variant;
      }
      setVariants(next);
    });

    return () => {
      mounted = false;
    };
  }, [experiments, experimentsKey]);

  return variants;
}
