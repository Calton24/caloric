/**
 * Voice Capture Hook
 *
 * Orchestrates the full speech-recognition lifecycle:
 *   1. Verifies permissions (redirects to permissions-setup if missing)
 *   2. Starts the native recogniser via expo-speech-recognition
 *   3. Streams interim transcripts + captures the final result
 *   4. Writes every state change to the voice Zustand store
 *
 * The voice-log screen consumes this hook and reads display state from the store.
 */

import { useRouter } from "expo-router";
import {
    ExpoSpeechRecognitionModule,
    useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef } from "react";
import { checkVoicePermissions } from "../permissions/permissions.service";
import { usePermissionsStore } from "../permissions/permissions.store";
import { useSettingsStore } from "../settings/settings.store";
import { useVoiceStore } from "./voice.store";

export function useVoiceCapture() {
  const router = useRouter();
  const store = useVoiceStore();
  const storeRef = useRef(store);
  storeRef.current = store;

  // ---------------------------------------------------------------------------
  // Native event listeners — wired for the lifetime of the hosting component
  // ---------------------------------------------------------------------------

  useSpeechRecognitionEvent("start", () => {
    storeRef.current.setStatus("listening");
    storeRef.current.setListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    const s = useVoiceStore.getState();
    // Only finalise if we were actually listening (not if we errored)
    if (s.status === "listening" || s.status === "finalizing") {
      storeRef.current.setListening(false);
      // If we have a transcript, mark done; otherwise stay idle
      if (s.transcript.trim()) {
        storeRef.current.setStatus("done");
      } else {
        storeRef.current.setStatus("idle");
      }
    }
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript ?? "";
    storeRef.current.setTranscript(text);
    if (event.isFinal) {
      storeRef.current.setStatus("done");
      storeRef.current.setListening(false);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    // "no-speech" is common and not really an error — just reset
    if (event.error === "no-speech") {
      storeRef.current.reset();
      return;
    }
    storeRef.current.setError(event.message || `Speech error: ${event.error}`);
  });

  // ---------------------------------------------------------------------------
  // Actions exposed to the screen
  // ---------------------------------------------------------------------------

  // Guard: only redirect to permissions once per attempt
  const hasRedirectedRef = useRef(false);

  // Reset the redirect guard when permissions change (e.g. user granted and came back)
  const micPerm = usePermissionsStore((s) => s.permissions.microphone);
  const speechPerm = usePermissionsStore(
    (s) => s.permissions.speechRecognition
  );
  useEffect(() => {
    if (micPerm === "granted" && speechPerm === "granted") {
      hasRedirectedRef.current = false;
    }
  }, [micPerm, speechPerm]);

  /** Start listening — checks permissions first */
  const startListening = useCallback(async () => {
    // 1. Check permissions (non-prompting)
    const { granted } = await checkVoicePermissions();

    if (!granted) {
      // Only redirect once per attempt to prevent loops
      if (hasRedirectedRef.current) {
        // Reset so next tap can try again
        hasRedirectedRef.current = false;
        return;
      }
      hasRedirectedRef.current = true;
      router.push({
        pathname: "/(modals)/permissions-setup" as any,
        params: { source: "voice-log" },
      });
      return;
    }

    // Permission granted — reset the redirect guard
    hasRedirectedRef.current = false;

    // 2. Reset state and start the recogniser
    storeRef.current.reset();
    storeRef.current.setStatus("listening");

    // Use the user's configured input language
    const lang = useSettingsStore.getState().settings.inputLanguage;

    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults: true,
      continuous: false,
    });
  }, [router]);

  /** Stop listening (will trigger a final result via the "end" / "result" events) */
  const stopListening = useCallback(() => {
    storeRef.current.setStatus("finalizing");
    ExpoSpeechRecognitionModule.stop();
  }, []);

  /** Cancel and reset without producing a result */
  const cancelListening = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
    storeRef.current.reset();
  }, []);

  /** Reset back to idle so the user can try again */
  const retry = useCallback(() => {
    storeRef.current.reset();
  }, []);

  return {
    /** Current voice state (also available via useVoiceStore) */
    status: store.status,
    transcript: store.transcript,
    isListening: store.isListening,
    error: store.error,

    /** Actions */
    startListening,
    stopListening,
    cancelListening,
    retry,
  };
}
