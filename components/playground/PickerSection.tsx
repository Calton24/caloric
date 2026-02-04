import { Picker, Section, Text, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function PickerSection() {
  const [segmentedIndex, setSegmentedIndex] = useState<number | null>(0);
  const [wheelIndex, setWheelIndex] = useState<number | null>(0);
  const [menuIndex, setMenuIndex] = useState<number | null>(0);

  const options = ["Option A", "Option B", "Option C"];
  const fruits = ["Apple", "Banana", "Orange", "Mango", "Grape"];
  const sizes = ["Small", "Medium", "Large"];

  return (
    <Section title="🎯 Pickers">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Segmented Picker (Default)
        </Text>
        <Picker
          options={options}
          selectedIndex={segmentedIndex}
          variant="segmented"
          onOptionSelected={(e) => setSegmentedIndex(e.nativeEvent.index)}
        />
        <Text size={12} color="gray">
          {`Selected: ${segmentedIndex !== null ? options[segmentedIndex] : "None"}`}
        </Text>

        <Text size={14} color="gray">
          Menu Picker
        </Text>
        <Picker
          options={sizes}
          selectedIndex={menuIndex}
          variant="menu"
          label="Select Size"
          onOptionSelected={(e) => setMenuIndex(e.nativeEvent.index)}
        />
        <Text size={12} color="gray">
          {`Size: ${menuIndex !== null ? sizes[menuIndex] : "None"}`}
        </Text>

        <Text size={14} color="gray">
          Wheel Picker
        </Text>
        <Picker
          options={fruits}
          selectedIndex={wheelIndex}
          variant="wheel"
          onOptionSelected={(e) => setWheelIndex(e.nativeEvent.index)}
        />
        <Text size={12} color="gray">
          {`Fruit: ${wheelIndex !== null ? fruits[wheelIndex] : "None"}`}
        </Text>
      </VStack>
    </Section>
  );
}
