export type PermissionStatus = "unknown" | "granted" | "denied";

export interface PermissionState {
  microphone: PermissionStatus;
  speechRecognition: PermissionStatus;
  camera: PermissionStatus;
  notifications: PermissionStatus;
  liveActivitiesEnabled: boolean;
  appleHealthReadEnabled: boolean;
  appleHealthWriteEnabled: boolean;
}
