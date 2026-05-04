/**
 * Persists a single in-progress meal draft so the Home “Review” card survives
 * reloads and navigation. Cleared on successful save, explicit dismiss, expiry,
 * or auth boundaries (see setSessionUserId).
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  foodLogBreadcrumb,
  truncateFoodLogText,
} from "../food-logging/food-logging-telemetry";
import { getStorage } from "../../infrastructure/storage";
import { useNutritionDraftStore } from "./nutrition.draft.store";
import type { MealDraft } from "./nutrition.draft.types";
import type { PendingMealReview, PendingMealReviewSource } from "./pending-meal-review.types";

const TTL_MS = 24 * 60 * 60 * 1000;

const ANON_KEY = "anon";

function newId(): string {
  return `pmr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function sourceFromDraft(d: MealDraft): PendingMealReviewSource {
  if (d.rawInput?.trim().startsWith("barcode:")) return "barcode";
  if (d.source === "voice") return "voice";
  if (d.source === "manual" || d.source === "text") return "manual";
  return "ai_camera";
}

function effectiveUserKey(sessionUserId: string | null): string {
  return sessionUserId ?? ANON_KEY;
}

function safeCloneDraft(draft: MealDraft): MealDraft | null {
  try {
    return JSON.parse(JSON.stringify(draft)) as MealDraft;
  } catch {
    return null;
  }
}

type PersistedRecord = {
  userKey: string;
  review: PendingMealReview;
};

interface PendingMealReviewState {
  record: PersistedRecord | null;
  /** Set from Auth — not persisted */
  sessionUserId: string | null;

  setSessionUserId: (userId: string | null) => void;
  commitPendingMealReviewFromStores: () => void;
  clearPendingMealReview: (reason: string) => void;
  expireIfStale: () => void;
  /**
   * Pending review for the current user if not expired; otherwise null.
   * Also drops other users’ records (e.g. after sign-out) via scope check.
   */
  getPendingForHome: () => PendingMealReview | null;
  /**
   * Restore draft + log date and open confirm-meal. Returns false if nothing to restore or clone failed.
   */
  restorePendingToDraftAndNavigate: (router: {
    push: (href: never) => void;
  }) => boolean;
}

function logPending(step: string, message: string, data?: Record<string, unknown>) {
  foodLogBreadcrumb(message, {
    area: "food_logging",
    flow: "pending_review",
    step,
    ...data,
  });
}

export const usePendingMealReviewStore = create<PendingMealReviewState>()(
  persist(
    (set, get) => ({
      record: null,
      sessionUserId: null,

      setSessionUserId: (userId) => {
        set((state) => {
          const prevKey = effectiveUserKey(state.sessionUserId);
          const nextKey = effectiveUserKey(userId);

          // Signed out: drop authenticated users’ pending (privacy + scope).
          if (!userId && state.record && state.record.userKey !== ANON_KEY) {
            logPending("clear", "[PendingMealReview] cleared", {
              reason: "signed_out",
              hadTitle: !!state.record.review.title,
            });
            return { sessionUserId: null, record: null };
          }

          // Signed in: migrate anonymous pending to this account.
          if (
            userId &&
            state.record?.userKey === ANON_KEY &&
            nextKey === userId
          ) {
            return {
              sessionUserId: userId,
              record: { userKey: userId, review: state.record.review },
            };
          }

          if (state.sessionUserId === userId && prevKey === nextKey) {
            return state;
          }

          return { sessionUserId: userId };
        });
      },

      commitPendingMealReviewFromStores: () => {
        const draft = useNutritionDraftStore.getState().draft;
        if (!draft) return;

        const clone = safeCloneDraft(draft);
        if (!clone) {
          logPending("create", "[PendingMealReview] create_failed", {
            reason: "draft_serialize",
            titleTruncated: truncateFoodLogText(draft.title),
          });
          return;
        }

        const logDateStore = useNutritionDraftStore.getState().logDate;
        const userKey = effectiveUserKey(get().sessionUserId);
        const now = new Date();
        const createdAt = now.toISOString();
        const expiresAt = new Date(now.getTime() + TTL_MS).toISOString();
        const source = sourceFromDraft(clone);

        const review: PendingMealReview = {
          id: newId(),
          createdAt,
          expiresAt,
          source,
          title: clone.title,
          calories: clone.calories,
          protein: clone.protein,
          carbs: clone.carbs,
          fat: clone.fat,
          imageUri: clone.imageUri,
          confidence: clone.confidence,
          logDate: logDateStore,
          draft: clone,
          status: "pending_review",
        };

        set({
          record: {
            userKey,
            review,
          },
        });

        logPending("create", "[PendingMealReview] created", {
          titleTruncated: truncateFoodLogText(clone.title),
          source,
          calories: clone.calories,
          hasImageUri: !!clone.imageUri && !clone.imageUri.startsWith("data:"),
          userScoped: userKey !== ANON_KEY,
        });
      },

      clearPendingMealReview: (reason) => {
        const had = get().record;
        if (!had) return;
        logPending("clear", "[PendingMealReview] cleared", {
          reason,
          titleTruncated: truncateFoodLogText(had.review.title),
        });
        set({ record: null });
      },

      expireIfStale: () => {
        const rec = get().record;
        if (!rec) return;
        const exp = Date.parse(rec.review.expiresAt);
        if (Number.isFinite(exp) && Date.now() > exp) {
          logPending("expire", "[PendingMealReview] expired", {
            titleTruncated: truncateFoodLogText(rec.review.title),
          });
          set({ record: null });
        }
      },

      getPendingForHome: () => {
        get().expireIfStale();
        const rec = get().record;
        if (!rec) return null;

        const key = effectiveUserKey(get().sessionUserId);
        if (rec.userKey !== key) return null;

        return rec.review;
      },

      restorePendingToDraftAndNavigate: (router) => {
        get().expireIfStale();
        const rec = get().record;
        if (!rec) return false;

        const key = effectiveUserKey(get().sessionUserId);
        if (rec.userKey !== key) {
          logPending("restore", "[PendingMealReview] restore_failed", {
            reason: "user_scope",
          });
          return false;
        }

        const clone = safeCloneDraft(rec.review.draft);
        if (!clone) {
          logPending("restore", "[PendingMealReview] restore_failed", {
            reason: "draft_parse",
            titleTruncated: truncateFoodLogText(rec.review.title),
          });
          return false;
        }

        useNutritionDraftStore.getState().setDraft(clone);
        useNutritionDraftStore.getState().setLogDate(rec.review.logDate);

        logPending("restore", "[PendingMealReview] restored", {
          titleTruncated: truncateFoodLogText(clone.title),
          source: rec.review.source,
          hasImageUri: !!clone.imageUri && !clone.imageUri.startsWith("data:"),
        });

        router.push("/(modals)/confirm-meal" as never);
        return true;
      },
    }),
    {
      name: "caloric-pending-meal-review",
      partialize: (s) => ({ record: s.record }),
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
