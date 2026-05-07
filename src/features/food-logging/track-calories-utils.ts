export type TrackCaloriesSourceFlow = "text" | "voice" | "ai_camera" | "barcode";

export function createTrackCaloriesFlowId(): string {
  return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function mapDraftSourceToTrackFlow(
  source: string | undefined
): TrackCaloriesSourceFlow {
  if (source === "voice") return "voice";
  if (source === "barcode") return "barcode";
  if (source === "camera" || source === "image") return "ai_camera";
  return "text";
}
