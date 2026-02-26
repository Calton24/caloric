/**
 * Haptics - React Hooks
 * Convenience hooks for common haptic patterns
 */

import { useCallback } from "react";
import { haptics } from "./haptics";
import type { ImpactStyle } from "./types";

/**
 * Hook that returns a callback to trigger haptic feedback on tab press
 * Use this in tab bar components for consistent feedback
 *
 * @example
 * ```tsx
 * function TabButton() {
 *   const onPress = useHapticTabPress(() => {
 *     navigation.navigate('Home');
 *   });
 *
 *   return <Pressable onPress={onPress}>...</Pressable>;
 * }
 * ```
 */
export function useHapticTabPress(
  onPress?: () => void,
  style: ImpactStyle = "light"
) {
  return useCallback(() => {
    haptics.impact(style);
    onPress?.();
  }, [onPress, style]);
}

/**
 * Hook that returns a callback to trigger selection feedback
 * Use this for picker/selector interactions
 */
export function useHapticSelection(onSelect?: () => void) {
  return useCallback(() => {
    haptics.selection();
    onSelect?.();
  }, [onSelect]);
}
