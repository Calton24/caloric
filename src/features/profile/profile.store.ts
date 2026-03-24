import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { ActivityLevel, Gender, UserProfile } from "./profile.types";

interface ProfileStore {
  profile: UserProfile;
  setGender: (gender: Gender) => void;
  setBirthYear: (year: number) => void;
  setHeightCm: (heightCm: number) => void;
  setCurrentWeightLbs: (weight: number) => void;
  setGoalWeightLbs: (weight: number) => void;
  setActivityLevel: (level: ActivityLevel) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setWaterSettings: (goalMl: number, incrementMl: number) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const initialProfile: UserProfile = {
  id: "local-user",
  gender: null,
  birthYear: null,
  heightCm: null,
  currentWeightLbs: null,
  goalWeightLbs: null,
  activityLevel: null,
  weightUnit: "lbs",
  heightUnit: "cm",
  onboardingCompleted: false,
  waterGoalMl: 2000,
  waterIncrementMl: 250,
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: initialProfile,

      setGender: (gender) =>
        set((state) => ({
          profile: { ...state.profile, gender },
        })),

      setBirthYear: (birthYear) =>
        set((state) => ({
          profile: { ...state.profile, birthYear },
        })),

      setHeightCm: (heightCm) =>
        set((state) => ({
          profile: { ...state.profile, heightCm },
        })),

      setCurrentWeightLbs: (currentWeightLbs) =>
        set((state) => ({
          profile: { ...state.profile, currentWeightLbs },
        })),

      setGoalWeightLbs: (goalWeightLbs) =>
        set((state) => ({
          profile: { ...state.profile, goalWeightLbs },
        })),

      setActivityLevel: (activityLevel) =>
        set((state) => ({
          profile: { ...state.profile, activityLevel },
        })),

      setOnboardingCompleted: (onboardingCompleted) =>
        set((state) => ({
          profile: { ...state.profile, onboardingCompleted },
        })),

      setWaterSettings: (waterGoalMl, waterIncrementMl) =>
        set((state) => ({
          profile: { ...state.profile, waterGoalMl, waterIncrementMl },
        })),

      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      resetProfile: () => set({ profile: initialProfile }),
    }),
    {
      name: "caloric-profile",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
