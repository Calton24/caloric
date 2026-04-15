/**
 * Voice Feature — Zustand Store
 *
 * Holds live voice-capture state (status, transcript, errors).
 * The store is consumed by the voice-log screen and the use-voice-capture hook.
 */

import { create } from "zustand";
import type { VoiceState, VoiceStatus } from "./voice.types";

interface VoiceStore extends VoiceState {
  setStatus: (status: VoiceStatus) => void;
  setListening: (listening: boolean) => void;
  setTranscript: (transcript: string) => void;
  setError: (error: string) => void;
  /** Reset everything back to idle */
  reset: () => void;
}

const initialState: VoiceState = {
  status: "idle",
  transcript: "",
  isListening: false,
  error: null,
};

export const useVoiceStore = create<VoiceStore>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),

  setListening: (isListening) => set({ isListening }),

  setTranscript: (transcript) => set({ transcript }),

  setError: (error) => set({ error, status: "error", isListening: false }),

  reset: () => set(initialState),
}));
