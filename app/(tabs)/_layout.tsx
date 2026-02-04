import {
  Icon,
  Label,
  NativeTabs,
} from "expo-router/unstable-native-tabs";
import "react-native-reanimated";

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={"car.fill"} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="playground">
        <Icon sf={"sparkles"} />
        <Label>Playground</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
