/**
 * Apple Health — Sync Service
 *
 * Orchestrates bidirectional sync between Caloric and Apple HealthKit:
 *   - Import: Read weight samples from HealthKit → progress store
 *   - Export: Write logged meals (calories) to HealthKit
 *
 * Designed to be called from the Apple Health settings screen
 * or from background sync triggers.
 */

import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProgressStore } from "../progress/progress.store";
import { getHealthService } from "./health.factory";
import type { HealthKitWeightSample } from "./health.types";

/**
 * Import weight samples from HealthKit into the progress store.
 * Only imports samples that don't already exist (by date dedup).
 */
export async function importWeightFromHealthKit(
  days: number = 90
): Promise<{ imported: number }> {
  const service = getHealthService();

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const samples = await service.readWeightSamples(startDate, endDate);
  if (samples.length === 0) return { imported: 0 };

  const store = useProgressStore.getState();
  const existingDates = new Set(
    store.weightLogs.map((l) => l.date.slice(0, 10))
  );

  // Deduplicate by date — keep only one sample per day (latest)
  const byDate = new Map<string, HealthKitWeightSample>();
  for (const sample of samples) {
    const dateKey = sample.startDate.slice(0, 10);
    const existing = byDate.get(dateKey);
    if (!existing || sample.startDate > existing.startDate) {
      byDate.set(dateKey, sample);
    }
  }

  let imported = 0;
  for (const [dateKey, sample] of byDate) {
    if (existingDates.has(dateKey)) continue;

    store.addWeightLog({
      id: `hk_${dateKey}_${Date.now()}`,
      date: sample.startDate,
      weightLbs: sample.value,
    });
    imported++;
  }

  return { imported };
}

/**
 * Export a single weight entry to HealthKit.
 */
export async function exportWeightToHealthKit(
  weightLbs: number,
  date: Date = new Date()
): Promise<void> {
  const service = getHealthService();
  await service.writeWeight(weightLbs, date);
}

/**
 * Export today's logged meals as dietary energy to HealthKit.
 * Groups by meal and writes each as a separate sample.
 */
export async function exportMealsToHealthKit(
  date: string = new Date().toISOString().slice(0, 10)
): Promise<{ exported: number }> {
  const service = getHealthService();
  const meals = useNutritionStore.getState().meals;

  const todayMeals = meals.filter((m) => m.loggedAt.slice(0, 10) === date);

  let exported = 0;
  for (const meal of todayMeals) {
    if (meal.calories <= 0) continue;

    const loggedAt = new Date(meal.loggedAt);
    // Each meal is a point-in-time sample
    const endDate = new Date(loggedAt.getTime() + 60_000); // 1 min duration

    await service.writeCalories(meal.calories, loggedAt, endDate);
    exported++;
  }

  return { exported };
}

/**
 * Full bidirectional sync — import weight + export meals.
 */
export async function syncWithHealthKit(opts: {
  read: boolean;
  write: boolean;
}): Promise<{ weightImported: number; mealsExported: number }> {
  const service = getHealthService();

  const available = await service.isAvailable();
  if (!available) {
    return { weightImported: 0, mealsExported: 0 };
  }

  const granted = await service.requestPermissions(opts);
  if (!granted) {
    return { weightImported: 0, mealsExported: 0 };
  }

  let weightImported = 0;
  let mealsExported = 0;

  if (opts.read) {
    const result = await importWeightFromHealthKit(90);
    weightImported = result.imported;
  }

  if (opts.write) {
    const result = await exportMealsToHealthKit();
    mealsExported = result.exported;
  }

  return { weightImported, mealsExported };
}
