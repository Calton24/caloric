/**
 * ScreenShell
 * Standard screen wrapper: SafeAreaView + optional scroll + header/footer slots.
 * Eliminates boilerplate across every screen in your fork.
 *
 * Usage:
 *   <ScreenShell header={<GlassHeader title="Settings" />}>
 *     <TText>Content</TText>
 *   </ScreenShell>
 *
 *   <ScreenShell scroll={false} footer={<StickyFooterCTA label="Save" />}>
 *     <View>Fixed content</View>
 *   </ScreenShell>
 */

import React from "react";
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";

export interface ScreenShellProps {
  children: React.ReactNode;
  /** Header slot (rendered above scroll content) */
  header?: React.ReactNode;
  /** Footer slot (rendered below scroll content, outside scroll) */
  footer?: React.ReactNode;
  /** Enable/disable scrolling (default: true) */
  scroll?: boolean;
  /** Safe area edges to pad (default: ["top"]) */
  edges?: Edge[];
  /** Horizontal padding (default: theme.spacing.md) */
  padX?: number;
  /** Show vertical scroll indicator */
  showsScrollIndicator?: boolean;
  /** Additional style on the outer container */
  style?: StyleProp<ViewStyle>;
  /** Additional style on the scroll content */
  contentStyle?: StyleProp<ViewStyle>;
  /** testID for the root view */
  testID?: string;
}

export function ScreenShell({
  children,
  header,
  footer,
  scroll = true,
  edges = ["top"],
  padX,
  showsScrollIndicator = false,
  style,
  contentStyle,
  testID,
}: ScreenShellProps) {
  const { theme } = useTheme();
  const px = padX ?? theme.spacing.md;

  const body = scroll ? (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        { paddingHorizontal: px, paddingBottom: 40 },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={showsScrollIndicator}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fixed, { paddingHorizontal: px }, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      testID={testID}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        style,
      ]}
      edges={edges}
    >
      {header}
      {body}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  fixed: {
    flex: 1,
  },
});
