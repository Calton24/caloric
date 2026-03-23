import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { PermissionState, PermissionStatus } from "./permissions.types";

interface PermissionsStore {
  permissions: PermissionState;
  setPermission: (
    key: "microphone" | "speechRecognition" | "camera" | "notifications",
    status: PermissionStatus
  ) => void;
  setLiveActivitiesEnabled: (enabled: boolean) => void;
  setAppleHealthReadEnabled: (enabled: boolean) => void;
  setAppleHealthWriteEnabled: (enabled: boolean) => void;
  resetPermissions: () => void;
}

export const initialPermissions: PermissionState = {
  microphone: "unknown",
  speechRecognition: "unknown",
  camera: "unknown",
  notifications: "unknown",
  liveActivitiesEnabled: false,
  appleHealthReadEnabled: false,
  appleHealthWriteEnabled: false,
};

export const usePermissionsStore = create<PermissionsStore>()(
  persist(
    (set) => ({
      permissions: initialPermissions,

      setPermission: (key, status) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            [key]: status,
          },
        })),

      setLiveActivitiesEnabled: (liveActivitiesEnabled) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            liveActivitiesEnabled,
          },
        })),

      setAppleHealthReadEnabled: (appleHealthReadEnabled) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            appleHealthReadEnabled,
          },
        })),

      setAppleHealthWriteEnabled: (appleHealthWriteEnabled) =>
        set((state) => ({
          permissions: {
            ...state.permissions,
            appleHealthWriteEnabled,
          },
        })),

      resetPermissions: () => set({ permissions: initialPermissions }),
    }),
    {
      name: "caloric-permissions",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
