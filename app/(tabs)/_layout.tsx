import {
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import "react-native-reanimated";
import { FeatureFlags } from "@/config/features";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={"house.fill"} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      
      {FeatureFlags.SHOW_PLAYGROUND && (
        <NativeTabs.Trigger name="playground">
          <Icon sf={"sparkles"} />
          <Label>Playground</Label>
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
