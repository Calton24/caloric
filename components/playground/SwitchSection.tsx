import { Section, Switch, Text, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function SwitchSection() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [buttonValue, setButtonValue] = useState(false);
  const [coloredSwitch, setColoredSwitch] = useState(true);

  return (
    <Section title="🔀 Switches">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Switch Variants
        </Text>

        <Switch
          value={isEnabled}
          label="Standard Switch"
          onValueChange={setIsEnabled}
        />

        <Switch
          value={checkboxValue}
          label="Checkbox Variant"
          variant="checkbox"
          onValueChange={setCheckboxValue}
        />

        <Switch
          value={buttonValue}
          label="Button Variant"
          variant="button"
          onValueChange={setButtonValue}
        />

        <Text size={14} color="gray">
          Colored Switch
        </Text>

        <Switch
          value={coloredSwitch}
          label="Green Switch"
          color="green"
          onValueChange={setColoredSwitch}
        />

        <Text size={12} color="gray">
          {`Switch: ${isEnabled ? "ON" : "OFF"}`}
        </Text>
        <Text size={12} color="gray">
          {`Checkbox: ${checkboxValue ? "Checked" : "Unchecked"}`}
        </Text>
        <Text size={12} color="gray">
          {`Button: ${buttonValue ? "Active" : "Inactive"}`}
        </Text>
      </VStack>
    </Section>
  );
}
