/**
 * SnappableSheet
 * Helper for creating bottom sheets with 2 snap points
 */

import { Dimensions } from "react-native";

const { height: screenHeight } = Dimensions.get("window");

/**
 * Opens a bottom sheet with 2 snap points
 * @param openSheet - The open function from useBottomSheet()
 * @param content - The content to display in the sheet
 * @param snapPercentages - Array of 2 percentages [smaller, larger] (e.g., [40, 70])
 * @param minHeights - Optional minimum heights in pixels for each snap point
 */
export function openSnappableSheet(
  openSheet: (content: React.ReactNode, options?: any) => void,
  content: React.ReactNode,
  snapPercentages: [number, number] = [40, 70],
  minHeights: [number, number] = [280, 400]
) {
  const [smallerPercent, largerPercent] = snapPercentages;
  const [minSmall, minLarge] = minHeights;

  // Calculate snap points with minimum heights
  const snapPoint1 = Math.max(minSmall, screenHeight * (smallerPercent / 100));
  const snapPoint2 = Math.max(minLarge, screenHeight * (largerPercent / 100));

  openSheet(content, {
    snapPoints: [snapPoint1, snapPoint2],
  });
}

/**
 * Hook for creating a snappable sheet opener
 * @param snapPercentages - Array of 2 percentages [smaller, larger]
 * @param minHeights - Optional minimum heights in pixels
 * @returns Function to open the snappable sheet
 */
export function useSnappableSheet(
  snapPercentages: [number, number] = [40, 70],
  minHeights: [number, number] = [280, 400]
) {
  return (
    openSheet: (content: React.ReactNode, options?: any) => void,
    content: React.ReactNode
  ) => {
    openSnappableSheet(openSheet, content, snapPercentages, minHeights);
  };
}
