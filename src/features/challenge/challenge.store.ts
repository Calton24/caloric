import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import type {
    MilestoneDay,
    MilestonesSeen,
} from "./challenge-monetisation.types";
import type { ChallengeStatus, UserChallenge } from "./challenge.types";

interface ChallengeStore {
  challenge: UserChallenge | null;

  // ── Monetisation state (persisted) ──
  insightTriggered: boolean;
  lastInsightMessage: string | null;
  introUsed: boolean;
  milestonesSeen: MilestonesSeen;

  // Set the full active challenge (from server restore or on start)
  setChallenge: (challenge: UserChallenge) => void;

  // Patch just the status (e.g. after conversion)
  updateChallengeStatus: (status: ChallengeStatus) => void;

  // Mark offer as seen
  markOfferSeen: () => void;

  // Mark as converted (sets convertedAt if not already set)
  markConverted: () => void;

  // Reset local challenge state (e.g. on sign-out)
  clearChallenge: () => void;

  // ── Monetisation actions ──
  markInsightTriggered: (message?: string) => void;
  markIntroUsed: () => void;
  markMilestoneSeen: (day: MilestoneDay) => void;
}

export const useChallengeStore = create<ChallengeStore>()(
  persist(
    (set) => ({
      challenge: null,
      insightTriggered: false,
      lastInsightMessage: null,
      introUsed: false,
      milestonesSeen: { day7: false, day14: false, day21: false },

      setChallenge: (challenge) => set({ challenge }),

      updateChallengeStatus: (status) =>
        set((state) => {
          if (!state.challenge) return state;
          return {
            challenge: {
              ...state.challenge,
              status,
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      markOfferSeen: () =>
        set((state) => {
          if (!state.challenge) return state;
          return {
            challenge: {
              ...state.challenge,
              offerUnlocked: true,
              offerSeenAt:
                state.challenge.offerSeenAt ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      markConverted: () =>
        set((state) => {
          if (!state.challenge) return state;
          return {
            challenge: {
              ...state.challenge,
              status: "converted",
              convertedAt:
                state.challenge.convertedAt ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          };
        }),

      clearChallenge: () =>
        set({
          challenge: null,
          insightTriggered: false,
          introUsed: false,
          milestonesSeen: { day7: false, day14: false, day21: false },
        }),

      markInsightTriggered: (message) =>
        set({ insightTriggered: true, lastInsightMessage: message ?? null }),

      markIntroUsed: () => set({ introUsed: true }),

      markMilestoneSeen: (day) =>
        set((state) => ({
          milestonesSeen: {
            ...state.milestonesSeen,
            [`day${day}`]: true,
          },
        })),
    }),
    {
      name: "caloric-challenge",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
