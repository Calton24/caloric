import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { CalCutLogo } from "../../ui/brand/CalCutLogo";
import { TText } from "../../ui/primitives/TText";

/**
 * Full-screen placeholder while cloud restore + profile confirmation complete.
 * Avoids showing fake “zero history” before we know local state is trustworthy.
 */
export function HomeRestoreSkeleton() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.inner}>
        <CalCutLogo size={70} color={theme.colors.text} />
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={styles.spinner}
        />
        <TText
          variant="subheading"
          color="secondary"
          style={styles.message}
        >
          {t("home.restoringData", {
            defaultValue: "Loading your data…",
          })}
        </TText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  spinner: { marginTop: 8 },
  message: { textAlign: "center" },
});
