/**
 * Screen
 * Layout component for full screen views
 */

import React from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";

export interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  padding?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scrollable = false,
  padding = true,
  edges = ["top", "bottom"],
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = edges.includes("top") ? insets.top : 0;
  const paddingBottom = edges.includes("bottom") ? insets.bottom : 0;
  const paddingLeft = edges.includes("left") ? insets.left : 0;
  const paddingRight = edges.includes("right") ? insets.right : 0;

  const containerPadding = padding ? theme.spacing.md : 0;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: theme.colors.background,
      paddingTop,
      paddingLeft,
      paddingRight,
      // For scrollable, paddingBottom goes into contentContainerStyle
      paddingBottom: scrollable ? 0 : paddingBottom,
    },
    style,
  ];

  if (scrollable) {
    const scrollContentStyle = [
      styles.scrollContent,
      {
        padding: containerPadding,
        paddingBottom: paddingBottom + containerPadding + 40,
      },
      contentContainerStyle,
    ];

    return (
      <View style={containerStyle}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  const innerStyle = [
    styles.content,
    {
      padding: containerPadding,
    },
    contentContainerStyle,
  ];

  return (
    <View style={containerStyle}>
      <View style={innerStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
});
