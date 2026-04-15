import { Picker, Section, Text as UIText, VStack } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Text } from "react-native";

export function PickerSection() {
  const [segmentedIndex, setSegmentedIndex] = useState<number>(0);
  const [wheelIndex, setWheelIndex] = useState<number>(0);
  const [menuIndex, setMenuIndex] = useState<number>(0);

  const options = ["Option A", "Option B", "Option C"];
  const fruits = ["Apple", "Banana", "Orange", "Mango", "Grape"];
  const sizes = ["Small", "Medium", "Large"];

  return (
    <Section title="🎯 Pickers">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Segmented Picker (Default)</Text>
        <Picker
          selection={segmentedIndex}
          onSelectionChange={(v: number) => setSegmentedIndex(v)}
          modifiers={[pickerStyle("segmented")]}
        >
          {options.map((opt, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{opt}</UIText>
          ))}
        </Picker>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Selected: ${options[segmentedIndex]}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Menu Picker</Text>
        <Picker
          label="Select Size"
          selection={menuIndex}
          onSelectionChange={(v: number) => setMenuIndex(v)}
          modifiers={[pickerStyle("menu")]}
        >
          {sizes.map((size, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{size}</UIText>
          ))}
        </Picker>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Size: ${sizes[menuIndex]}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Wheel Picker</Text>
        <Picker
          selection={wheelIndex}
          onSelectionChange={(v: number) => setWheelIndex(v)}
          modifiers={[pickerStyle("wheel")]}
        >
          {fruits.map((fruit, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{fruit}</UIText>
          ))}
        </Picker>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Fruit: ${fruits[wheelIndex]}`}</Text>
      </VStack>
    </Section>
  );
}
