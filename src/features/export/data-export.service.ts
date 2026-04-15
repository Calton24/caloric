/**
 * Data Export Service
 *
 * Generates CSV files from meal and weight data,
 * then opens the native share sheet via expo-sharing.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { MealEntry } from "../nutrition/nutrition.types";
import { WeightLog } from "../progress/progress.types";

// ─── CSV Helpers ────────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSVRow(values: (string | number | undefined)[]): string {
  return values.map((v) => escapeCSV(String(v ?? ""))).join(",");
}

// ─── Export Functions ───────────────────────────────────────────────────────

function buildMealCSV(meals: MealEntry[]): string {
  const header = toCSVRow([
    "Date",
    "Time",
    "Title",
    "Source",
    "Calories",
    "Protein (g)",
    "Carbs (g)",
    "Fat (g)",
    "Meal Time",
    "Confidence",
  ]);

  const sorted = [...meals].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt)
  );

  const rows = sorted.map((m) => {
    const dt = new Date(m.loggedAt);
    const date = dt.toISOString().split("T")[0];
    const time = dt.toTimeString().slice(0, 5);
    return toCSVRow([
      date,
      time,
      m.title,
      m.source,
      m.calories,
      m.protein,
      m.carbs,
      m.fat,
      m.mealTime ?? "",
      m.confidence != null ? Math.round(m.confidence * 100) : "",
    ]);
  });

  return [header, ...rows].join("\n");
}

function buildWeightCSV(logs: WeightLog[]): string {
  const header = toCSVRow(["Date", "Weight (lbs)"]);

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sorted.map((l) => toCSVRow([l.date, l.weightLbs]));

  return [header, ...rows].join("\n");
}

// ─── File Helper ────────────────────────────────────────────────────────────

function writeCSVFile(filename: string, content: string): File {
  const file = new File(Paths.cache, filename);
  file.write(content);
  return file;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Export meal history as CSV and open the share sheet.
 */
export async function exportMealsCSV(meals: MealEntry[]): Promise<void> {
  if (meals.length === 0) throw new Error("No meals to export");

  const csv = buildMealCSV(meals);
  const date = new Date().toISOString().split("T")[0];
  const file = writeCSVFile(`caloric-meals-${date}.csv`, csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Export Meal History",
    UTI: "public.comma-separated-values-text",
  });
}

/**
 * Export weight logs as CSV and open the share sheet.
 */
export async function exportWeightCSV(logs: WeightLog[]): Promise<void> {
  if (logs.length === 0) throw new Error("No weight data to export");

  const csv = buildWeightCSV(logs);
  const date = new Date().toISOString().split("T")[0];
  const file = writeCSVFile(`caloric-weight-${date}.csv`, csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Export Weight Data",
    UTI: "public.comma-separated-values-text",
  });
}

/**
 * Export all data (meals + weight) as a combined CSV and open the share sheet.
 */
export async function exportAllDataCSV(
  meals: MealEntry[],
  weightLogs: WeightLog[]
): Promise<void> {
  const parts: string[] = [];

  if (meals.length > 0) {
    parts.push("=== MEAL HISTORY ===");
    parts.push(buildMealCSV(meals));
  }

  if (weightLogs.length > 0) {
    parts.push("");
    parts.push("=== WEIGHT LOGS ===");
    parts.push(buildWeightCSV(weightLogs));
  }

  if (parts.length === 0) throw new Error("No data to export");

  const csv = parts.join("\n");
  const date = new Date().toISOString().split("T")[0];
  const file = writeCSVFile(`caloric-export-${date}.csv`, csv);

  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    dialogTitle: "Export All Data",
    UTI: "public.comma-separated-values-text",
  });
}
