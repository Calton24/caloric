export type Gender = "male" | "female" | "other";
export type WeightUnit = "lbs" | "kg";
export type HeightUnit = "cm" | "ft_in";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "super";

export interface UserProfile {
  id: string;
  gender: Gender | null;
  birthYear: number | null;
  heightCm: number | null;
  currentWeightLbs: number | null;
  goalWeightLbs: number | null;
  activityLevel: ActivityLevel | null;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  onboardingCompleted: boolean;
}
