#!/usr/bin/env python3
"""Wire onboarding screens to Zustand stores via useOnboarding hook."""
import re, os

BASE = "/Users/calton/Coding/Mobile/caloric"

def read(path):
    with open(path, "r") as f:
        return f.read()

def write(path, content):
    with open(path, "w") as f:
        f.write(content)
    print(f"  ✓ {os.path.relpath(path, BASE)}")

# ─────────────────────────────────────────────────
# 1. GOAL SCREEN
# ─────────────────────────────────────────────────
def fix_goal(path, route_prefix):
    content = read(path)

    # Add import for useOnboarding
    if "useOnboarding" not in content:
        content = content.replace(
            'import { OnboardingProgress } from "./_progress";',
            'import { OnboardingProgress } from "./_progress";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";\nimport type { GoalType } from "../../src/features/goals/goals.types";'
        )

    # Remove "health" option from GOALS array
    content = re.sub(
        r',\s*\{\s*id:\s*"health".*?\}\s*(?=\]\s*as\s*const)',
        '\n',
        content,
        flags=re.DOTALL
    )

    # Replace local state with store
    content = content.replace(
        'const [selected, setSelected] = useState<string | null>(null);',
        'const { goalType, saveGoalType } = useOnboarding();'
    )

    # Replace selection checks
    content = content.replace(
        'const isSelected = selected === goal.id;',
        'const isSelected = goalType === goal.id;'
    )
    content = content.replace(
        'onPress={() => setSelected(goal.id)}',
        'onPress={() => saveGoalType(goal.id as GoalType)}'
    )

    # Replace disabled check
    content = content.replace(
        'disabled={!selected}',
        'disabled={!goalType}'
    )

    # Remove unused useState import if no longer needed
    if 'useState' not in content.replace('useOnboarding', '').replace('useState<string', ''):
        content = content.replace(', useState', '')
        content = content.replace('import { useState } from "react";\n', '')

    # Clean up: remove useState from the import if it existed
    content = content.replace(
        'import { useState } from "react";\n',
        ''
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 2. BODY SCREEN
# ─────────────────────────────────────────────────
def fix_body(path, route_prefix):
    content = read(path)

    # Add import for useOnboarding
    if "useOnboarding" not in content:
        content = content.replace(
            'import { OnboardingProgress } from "./_progress";',
            'import { OnboardingProgress } from "./_progress";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";'
        )

    # Add hook call after router
    content = content.replace(
        '  const { theme } = useTheme();\n  const router = useRouter();',
        '  const { theme } = useTheme();\n  const router = useRouter();\n  const { profile, saveBodyMeasurements } = useOnboarding();'
    )

    # Initialize state from profile where possible
    content = content.replace(
        "const [gender, setGender] = useState<string | null>(null);",
        "const [gender, setGender] = useState<string | null>(profile.gender);"
    )
    content = content.replace(
        "const [weight, setWeight] = useState(160);",
        "const [weight, setWeight] = useState(profile.currentWeightLbs ?? 160);"
    )

    # Find the router.push line and add store save before it
    old_push = f'router.push("{route_prefix}/activity" as any)'
    new_push = f"""(() => {{
              // Convert age → birthYear, ft/in → cm, then save to store
              const birthYear = new Date().getFullYear() - age;
              const heightCm = Math.round(heightFt * 30.48 + heightIn * 2.54);
              saveBodyMeasurements({{
                gender: gender as "male" | "female" | "other",
                birthYear,
                heightCm,
                currentWeightLbs: weight,
              }});
              router.push("{route_prefix}/activity" as any);
            }})()"""

    # Replace the onPress handler for the Continue button
    content = content.replace(
        f'onPress={{() => router.push("{route_prefix}/activity" as any)}}',
        f'onPress={{() => {new_push}}}'
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 3. ACTIVITY SCREEN
# ─────────────────────────────────────────────────
def fix_activity(path, route_prefix):
    content = read(path)

    # Add import
    if "useOnboarding" not in content:
        content = content.replace(
            'import { OnboardingProgress } from "./_progress";',
            'import { OnboardingProgress } from "./_progress";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";\nimport type { ActivityLevel } from "../../src/features/profile/profile.types";'
        )

    # Replace local state with store
    content = content.replace(
        'const [selected, setSelected] = useState<string | null>(null);',
        'const { profile, saveActivityLevel } = useOnboarding();\n  const selected = profile.activityLevel;'
    )

    # Wire selection to store
    content = content.replace(
        'onPress={() => setSelected(level.id)}',
        'onPress={() => saveActivityLevel(level.id as ActivityLevel)}'
    )

    # Remove unused useState
    content = content.replace(
        'import { useState } from "react";\n',
        ''
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 4. WEIGHT-GOAL SCREEN
# ─────────────────────────────────────────────────
def fix_weight_goal(path, route_prefix):
    content = read(path)

    # Add import
    if "useOnboarding" not in content:
        content = content.replace(
            'import { OnboardingProgress } from "./_progress";',
            'import { OnboardingProgress } from "./_progress";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";'
        )

    # Add hook call and read currentWeight from profile
    content = content.replace(
        '  const { theme } = useTheme();\n  const router = useRouter();\n  const currentWeight = 160; // would come from body step in real flow\n  const [goalWeight, setGoalWeight] = useState(145);',
        '  const { theme } = useTheme();\n  const router = useRouter();\n  const { profile, saveGoalWeight } = useOnboarding();\n  const currentWeight = profile.currentWeightLbs ?? 160;\n  const [goalWeight, setGoalWeight] = useState(profile.goalWeightLbs ?? Math.round(currentWeight * 0.9));'
    )

    # Wire Continue button to save goal weight
    content = content.replace(
        f'onPress={{() => router.push("{route_prefix}/timeframe" as any)}}',
        f'onPress={{() => {{ saveGoalWeight(goalWeight); router.push("{route_prefix}/timeframe" as any); }}}}'
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 5. TIMEFRAME SCREEN
# ─────────────────────────────────────────────────
def fix_timeframe(path, route_prefix):
    content = read(path)

    # Add import
    if "useOnboarding" not in content:
        content = content.replace(
            'import { OnboardingProgress } from "./_progress";',
            'import { OnboardingProgress } from "./_progress";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";'
        )

    # Replace local state with store
    content = content.replace(
        'const [selected, setSelected] = useState<string>("realistic");',
        'const { timeframeWeeks, saveTimeframe, profile } = useOnboarding();\n  // Map weeks back to id for selection highlighting\n  const selectedId = TIMEFRAMES.find((t) => t.weeks === timeframeWeeks)?.id ?? null;'
    )

    # Fix selection comparison
    content = content.replace(
        'const isSelected = selected === tf.id;',
        'const isSelected = selectedId === tf.id;'
    )

    # Wire selection to store
    content = content.replace(
        'onPress={() => setSelected(tf.id)}',
        'onPress={() => saveTimeframe(tf.weeks)}'
    )

    # Fix disabled state
    content = content.replace(
        f'onPress={{() => router.push("{route_prefix}/calculating" as any)}}',
        f'disabled={{!timeframeWeeks}}\n            onPress={{() => router.push("{route_prefix}/calculating" as any)}}'
    )

    # Replace hardcoded "145 lbs" text with profile data
    content = content.replace(
        'How quickly do you want to reach 145 lbs?',
        'How quickly do you want to reach {profile.goalWeightLbs ?? "your goal"} lbs?'
    )
    # Fix: that replacement would put JSX in a string literal. Let's revert and use a template.
    content = content.replace(
        'How quickly do you want to reach {profile.goalWeightLbs ?? "your goal"} lbs?',
        '{`How quickly do you want to reach ${profile.goalWeightLbs ?? "your goal"} lbs?`}'
    )
    # Need to convert the TText child from string to expression
    content = content.replace(
        ">{`How quickly do you want to reach ${profile.goalWeightLbs ?? \"your goal\"} lbs?`}<",
        ">\n              {`How quickly do you want to reach ${profile.goalWeightLbs ?? \"your goal\"} lbs?`}\n            <"
    )

    # Remove unused useState
    content = content.replace(
        'import { useState } from "react";\n',
        ''
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 6. CALCULATING SCREEN
# ─────────────────────────────────────────────────
def fix_calculating(path, route_prefix):
    content = read(path)

    # Add import
    if "useOnboarding" not in content:
        content = content.replace(
            'import { useTheme } from "../../src/theme/useTheme";',
            'import { useTheme } from "../../src/theme/useTheme";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";'
        )

    # Add hook call
    content = content.replace(
        '  const { theme } = useTheme();\n  const router = useRouter();',
        '  const { theme } = useTheme();\n  const router = useRouter();\n  const { calculatePlan } = useOnboarding();'
    )

    # Wire plan calculation before navigation
    content = content.replace(
        f'router.replace("{route_prefix}/plan" as any);',
        f'try {{ calculatePlan(); }} catch (e) {{ console.error("Plan calculation failed:", e); }}\n          router.replace("{route_prefix}/plan" as any);'
    )

    write(path, content)

# ─────────────────────────────────────────────────
# 7. PLAN SCREEN
# ─────────────────────────────────────────────────
def fix_plan(path, route_prefix):
    content = read(path)

    # Add store import
    if "useGoalsStore" not in content:
        content = content.replace(
            'import { useTheme } from "../../src/theme/useTheme";',
            'import { useTheme } from "../../src/theme/useTheme";\nimport { useGoalsStore } from "../../src/features/goals/goals.store";\nimport { useProfileStore } from "../../src/features/profile/profile.store";'
        )

    # Replace the hardcoded PLAN constant and MACROS with store-driven values
    # First, remove the old PLAN const
    content = re.sub(
        r'// ── Demo values.*?^const MACROS = \[.*?\];\n',
        '',
        content,
        flags=re.DOTALL | re.MULTILINE
    )

    # Add store reads after router
    old_router = '  const { theme } = useTheme();\n  const router = useRouter();'
    new_router = """  const { theme } = useTheme();
  const router = useRouter();
  const plan = useGoalsStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);

  // Derive display values from store
  const PLAN = {
    calories: plan?.calorieBudget ?? 0,
    protein: plan?.macros.protein ?? 0,
    carbs: plan?.macros.carbs ?? 0,
    fat: plan?.macros.fat ?? 0,
    goalWeeks: plan?.timeframeWeeks ?? 0,
    goalDate: plan?.targetDate
      ? new Date(plan.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    currentWeight: profile.currentWeightLbs ?? 0,
    goalWeight: profile.goalWeightLbs ?? 0,
  };

  const totalCals = PLAN.protein * 4 + PLAN.carbs * 4 + PLAN.fat * 9;
  const MACROS = [
    {
      label: "Protein",
      grams: PLAN.protein,
      pct: totalCals > 0 ? Math.round((PLAN.protein * 4 / totalCals) * 100) : 0,
      color: "#60A5FA",
      icon: "fish-outline" as const,
    },
    {
      label: "Carbs",
      grams: PLAN.carbs,
      pct: totalCals > 0 ? Math.round((PLAN.carbs * 4 / totalCals) * 100) : 0,
      color: "#FBBF24",
      icon: "nutrition-outline" as const,
    },
    {
      label: "Fat",
      grams: PLAN.fat,
      pct: totalCals > 0 ? Math.round((PLAN.fat * 9 / totalCals) * 100) : 0,
      color: "#F87171",
      icon: "water-outline" as const,
    },
  ];"""
    content = content.replace(old_router, new_router)

    write(path, content)

# ─────────────────────────────────────────────────
# 8. COMPLETE SCREEN
# ─────────────────────────────────────────────────
def fix_complete(path, route_prefix):
    content = read(path)

    # Add import
    if "useOnboarding" not in content:
        content = content.replace(
            'import { useTheme } from "../../src/theme/useTheme";',
            'import { useTheme } from "../../src/theme/useTheme";\nimport { useOnboarding } from "../../src/features/onboarding/use-onboarding";\nimport { useGoalsStore } from "../../src/features/goals/goals.store";'
        )

    # Add hook call
    content = content.replace(
        '  const { theme } = useTheme();\n  const router = useRouter();',
        '  const { theme } = useTheme();\n  const router = useRouter();\n  const { completeOnboarding, profile } = useOnboarding();\n  const plan = useGoalsStore((s) => s.plan);'
    )

    # Wire the "Let's Go" button to call completeOnboarding before routing
    if route_prefix == "/(onboarding)":
        old_press = 'onPress={() => router.replace("/(modals)/permissions-setup" as any)}'
        new_press = 'onPress={() => { completeOnboarding(); router.replace("/(modals)/permissions-setup" as any); }}'
    else:
        old_press = 'onPress={() => router.replace("/permissions" as any)}'
        new_press = 'onPress={() => { completeOnboarding(); router.replace("/permissions" as any); }}'

    content = content.replace(old_press, new_press)

    # Replace hardcoded summary pills with store data
    content = content.replace(
        """            {[
              {
                icon: "flame-outline" as const,
                label: "1,850 kcal/day",
                color: theme.colors.primary,
              },
              {
                icon: "trending-down-outline" as const,
                label: "145 lbs goal",
                color: theme.colors.success,
              },
              {
                icon: "calendar-outline" as const,
                label: "17 weeks",
                color: theme.colors.info,
              },
            ]""",
        """            {[
              {
                icon: "flame-outline" as const,
                label: `${plan?.calorieBudget?.toLocaleString() ?? "—"} kcal/day`,
                color: theme.colors.primary,
              },
              {
                icon: "trending-down-outline" as const,
                label: `${profile.goalWeightLbs ?? "—"} lbs goal`,
                color: theme.colors.success,
              },
              {
                icon: "calendar-outline" as const,
                label: `${plan?.timeframeWeeks ?? "—"} weeks`,
                color: theme.colors.info,
              },
            ]"""
    )

    write(path, content)

# ─────────────────────────────────────────────────
# EXECUTE
# ─────────────────────────────────────────────────
pairs = [
    ("app/(onboarding)", "/(onboarding)"),
    ("app/onboarding", "/onboarding"),
]

for folder, prefix in pairs:
    print(f"\n=== {folder} ===")
    fix_goal(f"{BASE}/{folder}/goal.tsx", prefix)
    fix_body(f"{BASE}/{folder}/body.tsx", prefix)
    fix_activity(f"{BASE}/{folder}/activity.tsx", prefix)
    fix_weight_goal(f"{BASE}/{folder}/weight-goal.tsx", prefix)
    fix_timeframe(f"{BASE}/{folder}/timeframe.tsx", prefix)
    fix_calculating(f"{BASE}/{folder}/calculating.tsx", prefix)
    fix_plan(f"{BASE}/{folder}/plan.tsx", prefix)
    fix_complete(f"{BASE}/{folder}/complete.tsx", prefix)

print("\n✅ All onboarding screens wired to stores.")
