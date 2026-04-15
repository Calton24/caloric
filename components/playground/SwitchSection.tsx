import { Section, Toggle, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text } from "react-native";

export function SwitchSection() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [buttonValue, setButtonValue] = useState(false);

  return (
    <Section title="🔀 Switches">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Toggle Variants</Text>

        <Toggle
          isOn={isEnabled}
          label="Standard Toggle"
          onIsOnChange={setIsEnabled}
        />

        <Toggle
          isOn={checkboxValue}
          label="Second Toggle"
          onIsOnChange={setCheckboxValue}
        />

        <Toggle
          isOn={buttonValue}
          label="Third Toggle"
          onIsOnChange={setButtonValue}
        />

        <Text style={{ fontSize: 12, color: "gray" }}>{`Toggle 1: ${isEnabled ? "ON" : "OFF"}`}</Text>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Toggle 2: ${checkboxValue ? "ON" : "OFF"}`}</Text>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Toggle 3: ${buttonValue ? "ON" : "OFF"}`}</Text>
      </VStack>
    </Section>
  );
}
