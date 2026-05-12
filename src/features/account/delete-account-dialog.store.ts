import { create } from "zustand";

type DeleteAccountDialogStore = {
  visible: boolean;
  open: () => void;
  close: () => void;
};

export const useDeleteAccountDialogStore = create<DeleteAccountDialogStore>(
  (set) => ({
    visible: false,
    open: () => {
      if (__DEV__) {
        console.log("[DeleteAccountDialogStore] open");
      }
      set({ visible: true });
    },
    close: () => {
      if (__DEV__) {
        console.log("[DeleteAccountDialogStore] close");
      }
      set({ visible: false });
    },
  })
);
