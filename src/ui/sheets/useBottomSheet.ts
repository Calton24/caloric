/**
 * useBottomSheet Hook
 * Access bottom sheet context
 */

import { useContext } from "react";
import { invariant } from "../../utils/invariant";
import {
    BottomSheetContext,
    BottomSheetContextValue,
} from "./BottomSheetProvider";

export function useBottomSheet(): BottomSheetContextValue {
  const context = useContext(BottomSheetContext);
  invariant(
    context !== undefined,
    "useBottomSheet must be used within a BottomSheetProvider. Did you forget to wrap your app with <CaloricProviders>?"
  );
  return context!;
}
