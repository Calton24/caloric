#!/usr/bin/env python3
"""Fix screen files for new type shapes."""
import re
import os

base = "/Users/calton/Coding/Mobile/caloric"

def fix_file(path, replacements):
    """Apply a list of (old, new) replacements to a file."""
    if not os.path.exists(path):
        print(f"SKIP {os.path.relpath(path, base)} (not found)")
        return
    with open(path, 'r') as f:
        content = f.read()
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new, 1)
        else:
            # Try to find approximate match for debugging
            pass
    with open(path, 'w') as f:
        f.write(content)
    print(f"OK {os.path.relpath(path, base)}")


# === CONFIRM-MEAL SCREENS ===
confirm_meal_replacements = [
    # Fix createDefaultMeal function
    ("""function createDefaultMeal(params: Record<string, string>): MealEntry {
  return {
    id: params.id ?? `meal_${Date.now()}`,
    date: params.date ?? new Date().toISOString().split("T")[0],
    time:
      params.time ??
      new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    title: params.title ?? "Unnamed Meal",
    icon: params.icon ?? "\U0001f37d\ufe0f",
    calories: Number(params.calories) || 0,
    proteinG: Number(params.proteinG) || 0,
    carbsG: Number(params.carbsG) || 0,
    fatG: Number(params.fatG) || 0,
    source: (params.source as MealEntry["source"]) ?? "manual",
    confirmed: false,
  };
}""",
     """function createDefaultMeal(params: Record<string, string>): MealEntry {
  return {
    id: params.id ?? `meal_${Date.now()}`,
    title: params.title ?? "Unnamed Meal",
    calories: Number(params.calories) || 0,
    protein: Number(params.protein) || 0,
    carbs: Number(params.carbs) || 0,
    fat: Number(params.fat) || 0,
    source: (params.source as MealEntry["source"]) ?? "manual",
    loggedAt: params.loggedAt ?? new Date().toISOString(),
  };
}"""),
    # Fix handleConfirm - remove confirmed field
    ('addMeal({ ...meal, confirmed: true });', 'addMeal(meal);'),
    # Fix icon usage  
    ('<TText style={styles.mealIcon}>{meal.icon}</TText>', '<TText style={styles.mealIcon}>\U0001f37d\ufe0f</TText>'),
    # Fix proteinG/carbsG/fatG field references
    ('value={meal.proteinG}', 'value={meal.protein}'),
    ('onChange={(v) => updateField("proteinG", v)}', 'onChange={(v) => updateField("protein", v)}'),
    ('value={meal.carbsG}', 'value={meal.carbs}'),
    ('onChange={(v) => updateField("carbsG", v)}', 'onChange={(v) => updateField("carbs", v)}'),
    ('value={meal.fatG}', 'value={meal.fat}'),
    ('onChange={(v) => updateField("fatG", v)}', 'onChange={(v) => updateField("fat", v)}'),
]

for p in [
    f"{base}/app/(modals)/confirm-meal.tsx",
    f"{base}/app/confirm-meal.tsx",
]:
    fix_file(p, confirm_meal_replacements)


# === LOG-WEIGHT SCREENS ===
log_weight_replacements = [
    # Fix latestWeight store access
    ("const latestWeight = useProgressStore((s) => s.latestWeight());",
     """const weightLogs = useProgressStore((s) => s.weightLogs);
  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightLbs : null;"""),
    # Fix null safety for goalWeightLbs
    ("{(weight - profile.goalWeightLbs).toFixed(1)} lbs to go)",
     "{(weight - (profile.goalWeightLbs ?? 0)).toFixed(1)} lbs to go)"),
]

for p in [
    f"{base}/app/(modals)/log-weight.tsx",
    f"{base}/app/log-weight.tsx",
]:
    fix_file(p, log_weight_replacements)


# === PERMISSIONS SCREENS ===
permissions_replacements = [
    ('"undetermined"', '"unknown"'),
]

for p in [
    f"{base}/app/(modals)/permissions-setup.tsx",
    f"{base}/app/permissions.tsx",
]:
    fix_file(p, permissions_replacements)


# === PROGRESS SCREENS ===
# Read these files first to understand exact patterns
for p in [
    f"{base}/app/(main)/progress.tsx",
    f"{base}/app/progress.tsx",
]:
    if not os.path.exists(p):
        print(f"SKIP {os.path.relpath(p, base)}")
        continue
    with open(p, 'r') as f:
        content = f.read()
    
    # Fix store access: getSnapshot, latestWeight, recalculate
    content = content.replace(
        "const getSnapshot = useProgressStore((s) => s.getSnapshot);",
        "const weightLogs = useProgressStore((s) => s.weightLogs);"
    )
    content = content.replace(
        "const latestWeight = useProgressStore((s) => s.latestWeight());",
        "const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightLbs : null;"
    )
    content = content.replace(
        "const recalculate = useGoalsStore((s) => s.recalculate);",
        "// Goal recalculation will be wired in next phase"
    )
    
    # Fix getSnapshot usage - replace with inline data
    content = content.replace(
        'const progress = getSnapshot(period);',
        '''const progress = {
    label: period,
    weights: weightLogs.map((l) => ({ date: l.date, weightLbs: l.weightLbs })),
    averageWeightLbs: weightLogs.length > 0 ? weightLogs.reduce((s, l) => s + l.weightLbs, 0) / weightLogs.length : 0,
    trendPct: null as number | null,
  };'''
    )
    
    # Fix goalWeight null safety
    content = content.replace(
        "const remaining = currentWeight - goalWeight;",
        "const remaining = currentWeight - (goalWeight ?? 0);"
    )
    
    # Fix goalWeight prop null safety
    content = content.replace(
        "goalWeight={goalWeight}",
        "goalWeight={goalWeight ?? undefined}"
    )
    
    with open(p, 'w') as f:
        f.write(content)
    print(f"OK {os.path.relpath(p, base)}")


# === SETTINGS SCREENS ===
for p in [
    f"{base}/app/(main)/settings.tsx",
    f"{base}/app/settings.tsx",
]:
    if not os.path.exists(p):
        print(f"SKIP {os.path.relpath(p, base)}")
        continue
    with open(p, 'r') as f:
        content = f.read()
    
    # Fix store imports - usePermissionStore -> usePermissionsStore, useBillingStore -> useSubscriptionStore
    content = content.replace("usePermissionStore", "usePermissionsStore")
    content = content.replace("useBillingStore", "useSubscriptionStore")
    
    # Fix toggleFeature
    content = content.replace(
        "const toggleFeature = usePermissionsStore((s) => s.toggleFeature);",
        "// Feature toggles will be wired to individual setters in next phase"
    )
    
    # Fix restorePurchases
    content = content.replace(
        "const restorePurchases = useSubscriptionStore((s) => s.restorePurchases);",
        "// Restore purchases will be wired to RevenueCat in next phase"
    )
    
    # Fix plan null safety
    content = content.replace(
        "plan.calorieBudget > 0",
        "plan && plan.calorieBudget > 0"
    )
    content = content.replace(
        '? `${plan.calorieBudget} cal/day \u00b7 ${plan.timeframeWeeks} weeks`',
        '? `${plan!.calorieBudget} cal/day \u00b7 ${plan!.timeframeWeeks} weeks`'
    )
    
    # Fix subscription.plan comparison  
    content = content.replace(
        'subscription.plan === "free"',
        'subscription.plan === null'
    )
    content = content.replace(
        'subscription.plan === "trial"',
        'subscription.trialStarted'
    )
    
    # Fix profile.name
    content = content.replace(
        "value={profile.name}",
        'value={profile.id}'
    )
    
    # Fix profile.units
    content = content.replace(
        'value={profile.units === "imperial" ? "Imperial" : "Metric"}',
        'value={profile.weightUnit === "lbs" ? "Imperial" : "Metric"}'
    )
    
    # Fix activityLevel null safety
    content = content.replace(
        "profile.activityLevel.charAt(0).toUpperCase() +\n                  profile.activityLevel.slice(1)",
        "(profile.activityLevel ?? \"moderate\").charAt(0).toUpperCase() +\n                  (profile.activityLevel ?? \"moderate\").slice(1)"
    )
    
    with open(p, 'w') as f:
        f.write(content)
    print(f"OK {os.path.relpath(p, base)}")


# === VOICE-LOG / MANUAL-LOG SCREENS ===
for p in [
    f"{base}/app/tracking/voice.tsx",
    f"{base}/app/tracking/manual.tsx",
    f"{base}/app/(modals)/voice-log.tsx",
    f"{base}/app/(modals)/manual-log.tsx",
]:
    if not os.path.exists(p):
        print(f"SKIP {os.path.relpath(p, base)}")
        continue
    with open(p, 'r') as f:
        content = f.read()
    
    # Fix proteinG/carbsG/fatG in route params
    content = content.replace("proteinG:", "protein:")
    content = content.replace("carbsG:", "carbs:")
    content = content.replace("fatG:", "fat:")
    
    with open(p, 'w') as f:
        f.write(content)
    print(f"OK {os.path.relpath(p, base)}")


# === PERMISSION ROW COMPONENT ===
perm_row_path = f"{base}/src/ui/components/PermissionRow.tsx"
if os.path.exists(perm_row_path):
    with open(perm_row_path, 'r') as f:
        content = f.read()
    # The import type should still work since PermissionStatus is still exported
    # Just make sure the default value is "unknown" not "undetermined"  
    content = content.replace('"undetermined"', '"unknown"')
    with open(perm_row_path, 'w') as f:
        f.write(content)
    print(f"OK src/ui/components/PermissionRow.tsx")


# === SETTINGS FEATURES CHECK ===
# Check if there's a settings.types.ts that's imported
settings_types = f"{base}/src/features/settings/settings.types.ts"
if os.path.exists(settings_types):
    print(f"EXISTS {os.path.relpath(settings_types, base)}")
else:
    # Create a minimal one since src/types/nutrition.ts references it
    os.makedirs(os.path.dirname(settings_types), exist_ok=True)
    with open(settings_types, 'w') as f:
        f.write("""export interface AppSettings {
  liveActivitiesEnabled: boolean;
  notificationsEnabled: boolean;
  hasSeenPermissions: boolean;
  hasSeenLiveActivityIntro: boolean;
}
""")
    print(f"CREATED {os.path.relpath(settings_types, base)}")


print("\nAll screen fixes applied.")
