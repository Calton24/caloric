import { FeatureFlags } from "@/config/features";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { View } from "react-native";
import "react-native-reanimated";

export default function TabLayout() {
  return (
    <View testID="tabs-root" style={{ flex: 1 }}>
      <NativeTabs>
        {FeatureFlags.SHOW_HOME && (
          <NativeTabs.Trigger name="index">
            <Icon sf={"house.fill"} />
            <Label>Home</Label>
          </NativeTabs.Trigger>
        )}

        {FeatureFlags.SHOW_NOTES && (
          <NativeTabs.Trigger name="notes">
            <Icon sf={"note.text"} />
            <Label>Notes</Label>
          </NativeTabs.Trigger>
        )}

        {FeatureFlags.SHOW_AUTH && (
          <NativeTabs.Trigger name="auth">
            <Icon sf={"person.circle.fill"} />
            <Label>Auth</Label>
          </NativeTabs.Trigger>
        )}

        {FeatureFlags.SHOW_PLAYGROUND && (
          <NativeTabs.Trigger name="playground">
            <Icon sf={"sparkles"} />
            <Label>Playground</Label>
          </NativeTabs.Trigger>
        )}

        {FeatureFlags.SHOW_MOBILE_CORE && (
          <NativeTabs.Trigger name="mobile-core">
            <Icon sf={"hammer.fill"} />
            <Label>Mobile Core</Label>
          </NativeTabs.Trigger>
        )}
      </NativeTabs>
    </View>
  );
}
