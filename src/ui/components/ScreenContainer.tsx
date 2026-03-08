/**
 * ScreenContainer
 * Standard dark background wrapper with SafeAreaView.
 * Used as the base container for all product screens.
 */

import React from "react";
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Whether the content should scroll */
  scrollable?: boolean;
  /** Extra padding override */
  padding?: number;
  /** SafeAreaView edges to respect */
  edges?: ("top" | "bottom" | "left" | "right")[];
  /** Extra styles */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ScreenContainer({
  children,
  scrollable = true,
  padding = 20,
  edges = ["top"],
  style,
  testID,
}: ScreenContainerProps) {
  const { theme } = useTheme();

  const content = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { padding }]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { padding }, style]}>{children}</View>
  );

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={edges}>
        {content}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticContent: {
    flex: 1,
  },
});
