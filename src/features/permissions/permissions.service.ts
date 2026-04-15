/**
 * Permissions Service
 *
 * Thin wrapper around expo-speech-recognition permission APIs.
 * Normalises the Expo PermissionResponse into the app's PermissionStatus type
 * and writes the result to the permissions store so it's globally available.
 */

import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { usePermissionsStore } from "./permissions.store";
import type { PermissionStatus } from "./permissions.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map an Expo PermissionResponse.status to our app PermissionStatus */
function toAppStatus(granted: boolean): PermissionStatus {
  return granted ? "granted" : "denied";
}

// ---------------------------------------------------------------------------
// Individual permission requests
// ---------------------------------------------------------------------------

/**
 * Request microphone permission.
 * Returns the normalised PermissionStatus and writes it to the store.
 */
export async function requestMicrophonePermission(): Promise<PermissionStatus> {
  const res =
    await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
  const status = toAppStatus(res.granted);
  usePermissionsStore.getState().setPermission("microphone", status);
  return status;
}

/**
 * Request speech-recogniser permission.
 * Returns the normalised PermissionStatus and writes it to the store.
 */
export async function requestSpeechRecognitionPermission(): Promise<PermissionStatus> {
  const res =
    await ExpoSpeechRecognitionModule.requestSpeechRecognizerPermissionsAsync();
  const status = toAppStatus(res.granted);
  usePermissionsStore.getState().setPermission("speechRecognition", status);
  return status;
}

// ---------------------------------------------------------------------------
// Combined convenience
// ---------------------------------------------------------------------------

/**
 * Request both microphone AND speech-recognition permissions.
 * Uses the combined `requestPermissionsAsync()` which presents a single
 * dialog flow on iOS.
 *
 * Writes individual results to the permissions store and returns whether
 * both were granted.
 */
export async function requestVoicePermissions(): Promise<{
  granted: boolean;
  microphone: PermissionStatus;
  speechRecognition: PermissionStatus;
}> {
  const res = await ExpoSpeechRecognitionModule.requestPermissionsAsync();

  // The combined call returns a single `granted` boolean.
  // To know each individually, query them.
  const micRes =
    await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
  const speechRes =
    await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync();

  const mic = toAppStatus(micRes.granted);
  const speech = toAppStatus(speechRes.granted);

  const store = usePermissionsStore.getState();
  store.setPermission("microphone", mic);
  store.setPermission("speechRecognition", speech);

  return {
    granted: res.granted,
    microphone: mic,
    speechRecognition: speech,
  };
}

/**
 * Check current voice permission status without prompting the user.
 * Writes results to the permissions store.
 */
export async function checkVoicePermissions(): Promise<{
  granted: boolean;
  microphone: PermissionStatus;
  speechRecognition: PermissionStatus;
}> {
  const res = await ExpoSpeechRecognitionModule.getPermissionsAsync();

  const micRes =
    await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
  const speechRes =
    await ExpoSpeechRecognitionModule.getSpeechRecognizerPermissionsAsync();

  const mic = toAppStatus(micRes.granted);
  const speech = toAppStatus(speechRes.granted);

  const store = usePermissionsStore.getState();
  store.setPermission("microphone", mic);
  store.setPermission("speechRecognition", speech);

  return {
    granted: res.granted,
    microphone: mic,
    speechRecognition: speech,
  };
}
