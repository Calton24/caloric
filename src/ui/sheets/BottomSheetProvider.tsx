/**
 * BottomSheetProvider
 * Clean bottom sheet manager using @gorhom/bottom-sheet
 */

import type { BottomSheetModal as BottomSheetModalType } from "@gorhom/bottom-sheet";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import React, {
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface BottomSheetOptions {
  snapPoints?: string[] | number[];
  enablePanDownToClose?: boolean;
}

export interface BottomSheetContextValue {
  open: (content: React.ReactNode, options?: BottomSheetOptions) => void;
  close: () => void;
}

export const BottomSheetContext = createContext<
  BottomSheetContextValue | undefined
>(undefined);

interface BottomSheetProviderProps {
  children: React.ReactNode;
}

export function BottomSheetProvider({ children }: BottomSheetProviderProps) {
  const { theme } = useTheme();
  const bottomSheetRef = useRef<BottomSheetModalType>(null);
  const [content, setContent] = useState<React.ReactNode | null>(null);
  const [snapPoints, setSnapPoints] = useState<string[] | number[]>(["50%"]);
  const [pendingPresent, setPendingPresent] = useState(false);
  const isShowingRef = useRef(false);
  const pendingRef = useRef<{
    content: React.ReactNode;
    points: string[] | number[];
  } | null>(null);

  const open = useCallback(
    (newContent: React.ReactNode, options?: BottomSheetOptions) => {
      const points = options?.snapPoints || ["50%"];

      if (isShowingRef.current) {
        // Sheet is visible — queue the new content and dismiss first.
        // onDismiss will present the queued content once the animation ends.
        pendingRef.current = { content: newContent, points };
        bottomSheetRef.current?.dismiss();
      } else {
        // Nothing showing — set content and present directly
        setContent(newContent);
        setSnapPoints(points);
        setPendingPresent(true);
      }
    },
    []
  );

  // Present the sheet after state updates have flushed and the
  // BottomSheetModal has re-rendered with the new content/snapPoints.
  useEffect(() => {
    if (!pendingPresent) return;
    // Use rAF to wait for the next frame after React commit
    const id = requestAnimationFrame(() => {
      bottomSheetRef.current?.present();
      setPendingPresent(false);
    });
    return () => cancelAnimationFrame(id);
  }, [pendingPresent]);

  const handleDismiss = useCallback(() => {
    isShowingRef.current = false;
    if (pendingRef.current) {
      const { content: c, points: p } = pendingRef.current;
      pendingRef.current = null;
      setContent(c);
      setSnapPoints(p);
      setPendingPresent(true);
    }
  }, []);

  const handleChange = useCallback((index: number) => {
    isShowingRef.current = index >= 0;
  }, []);

  const close = useCallback(() => {
    bottomSheetRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={close}
      />
    ),
    [close]
  );

  const renderBackground = useCallback(
    ({ style }: any) => (
      <BlurView
        intensity={100}
        tint={theme.mode === "light" ? "extraLight" : "dark"}
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg,
            overflow: "hidden",
          },
          style,
        ]}
      />
    ),
    [theme.mode, theme.radius.lg]
  );

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <BottomSheetContext.Provider value={value}>
      {children}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundComponent={renderBackground}
        backgroundStyle={{ backgroundColor: "transparent" }}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.textSecondary,
        }}
        onDismiss={handleDismiss}
        onChange={handleChange}
      >
        <BottomSheetScrollView style={styles.contentContainer}>
          <BottomSheetContext.Provider value={value}>
            {content}
          </BottomSheetContext.Provider>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
