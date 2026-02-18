import { FeatureFlags } from "@/config/features";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import "react-native-reanimated";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={"house.fill"} />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      {/* Notes: Validation harness - dev only */}
      {__DEV__ && (
        <NativeTabs.Trigger name="notes">
          <Icon sf={"note.text"} />
          <Label>Notes</Label>
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="auth">
        <Icon sf={"person.circle.fill"} />
        <Label>Auth</Label>
      </NativeTabs.Trigger>

      {FeatureFlags.SHOW_PLAYGROUND && (
        <NativeTabs.Trigger name="playground">
          <Icon sf={"sparkles"} />
          <Label>Playground</Label>
        </NativeTabs.Trigger>
      )}

      {__DEV__ && (
        <NativeTabs.Trigger name="mobile-core">
          <Icon sf={"hammer.fill"} />
          <Label>Mobile Core</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
