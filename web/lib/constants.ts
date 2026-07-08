export const APP_STORE_URL =
  "https://apps.apple.com/gb/app/calcut-ai-calorie-tracker/id6761738426";

export const SITE_NAME = "CalCut";
export const SITE_TAGLINE = "AI Calorie Tracker";

export const FITNESS_GOALS = [
  { value: "lose_fat", label: "Lose fat" },
  { value: "maintain", label: "Maintain" },
  { value: "build_muscle", label: "Build muscle" },
  { value: "improve_habits", label: "Improve habits" },
] as const;

export type FitnessGoalValue = (typeof FITNESS_GOALS)[number]["value"];

export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}
