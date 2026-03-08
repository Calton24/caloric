import { create } from "zustand";
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
};

export const useProfileStore = create<ProfileStore>((set) => ({
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

  updateProfile: (updates) =>
    set((state) => ({
      profile: { ...state.profile, ...updates },
    })),

  resetProfile: () => set({ profile: initialProfile }),
}));
