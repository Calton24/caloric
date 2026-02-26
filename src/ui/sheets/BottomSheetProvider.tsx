/**
 * BottomSheetProvider
 * Clean bottom sheet manager using @gorhom/bottom-sheet
 */

import type { BottomSheetModal as BottomSheetModalType } from "@gorhom/bottom-sheet";
import {
    BottomSheetBackdrop,
    BottomSheetModal,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import React, {
    createContext,
    useCallback,
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
  const [modalKey, setModalKey] = useState(0);

  const open = useCallback(
    (newContent: React.ReactNode, options?: BottomSheetOptions) => {
      const points = options?.snapPoints || ["50%"];

      // Force remount with new key to ensure fresh snap points
      setModalKey((prev) => prev + 1);
      setContent(newContent);
      setSnapPoints(points);

      // Present after remount
      setTimeout(() => {
        bottomSheetRef.current?.present();
      }, 100);
    },
    []
  );

  const close = useCallback(() => {
    bottomSheetRef.current?.close();
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
        key={modalKey}
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
      >
        <BottomSheetView style={styles.contentContainer}>
          <BottomSheetContext.Provider value={value}>
            {content}
          </BottomSheetContext.Provider>
        </BottomSheetView>
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
