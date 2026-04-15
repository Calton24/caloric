/**
 * Voice Feature — Types
 *
 * Describes the voice capture lifecycle used by the voice-log screen.
 */

/** Lifecycle status for the voice capture flow */
export type VoiceStatus =
  | "idle" // Ready to start
  | "requesting-permissions" // Checking / requesting mic + speech permissions
  | "listening" // Speech recognizer is actively listening
  | "finalizing" // Recognizer stopped, awaiting final result
  | "done" // Final transcript available
  | "error"; // Something went wrong

/** Shape persisted in the voice Zustand store */
export interface VoiceState {
  status: VoiceStatus;
  /** Partial or final transcript text */
  transcript: string;
  /** Whether the recognizer is currently listening */
  isListening: boolean;
  /** Human-readable error message, if any */
  error: string | null;
}
