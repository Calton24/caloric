/**
 * Shared onboarding progress bar component
 * Horizontal segmented bar — current step has flex:2 + primary color.
 */

import { StyleSheet, View } from "react-native";

export function OnboardingProgress({
  step,
  total,
  theme,
}: {
  step: number;
  total: number;
  theme: any;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            {
              backgroundColor:
                i + 1 <= step ? theme.colors.primary : theme.colors.border,
              flex: i + 1 === step ? 2 : 1,
              borderRadius: 4,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    height: 4,
  },
  segment: {
    height: 4,
  },
});
