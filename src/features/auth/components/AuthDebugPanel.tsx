/**
 * AuthDebugPanel
 * Dev-only debug panel for auth state
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { DevOnly } from "../../../ui/dev/DevOnly";
import { GlassCard } from "../../../ui/glass/GlassCard";
import { TButton } from "../../../ui/primitives/TButton";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { TText } from "../../../ui/primitives/TText";
import { useAuth } from "../useAuth";

export function AuthDebugPanel() {
  const { user, session, isLoading, signOut } = useAuth();
  const { theme } = useTheme();

  return (
    <DevOnly>
      <GlassCard style={{ marginTop: theme.spacing.lg }}>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          🔧 Debug Panel
        </TText>

        <View style={styles.row}>
          <TText
            color="secondary"
            style={{ fontSize: theme.typography.fontSize.sm }}
          >
            Loading:
          </TText>
          <TSpacer size="sm" horizontal />
          <TText style={{ fontSize: theme.typography.fontSize.sm }}>
            {isLoading ? "Yes" : "No"}
          </TText>
        </View>

        <TSpacer size="xs" />

        <View style={styles.row}>
          <TText
            color="secondary"
            style={{ fontSize: theme.typography.fontSize.sm }}
          >
            User:
          </TText>
          <TSpacer size="sm" horizontal />
          <TText style={{ fontSize: theme.typography.fontSize.sm }}>
            {user ? user.email : "None"}
          </TText>
        </View>

        <TSpacer size="xs" />

        <View style={styles.row}>
          <TText
            color="secondary"
            style={{ fontSize: theme.typography.fontSize.sm }}
          >
            Session:
          </TText>
          <TSpacer size="sm" horizontal />
          <TText style={{ fontSize: theme.typography.fontSize.sm }}>
            {session ? "Active" : "None"}
          </TText>
        </View>

        {user && (
          <>
            <TSpacer size="md" />
            <TButton onPress={signOut} variant="outline" size="sm">
              Sign Out
            </TButton>
          </>
        )}
      </GlassCard>
    </DevOnly>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
