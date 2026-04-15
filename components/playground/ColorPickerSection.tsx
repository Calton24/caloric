import { ColorPicker, HStack, Section, VStack } from "@expo/ui/swift-ui";
import { background, cornerRadius, frame } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Text, View } from "react-native";

export function ColorPickerSection() {
  const [color1, setColor1] = useState("#007AFF");
  const [color2, setColor2] = useState("#FF3B30");
  const [colorWithOpacity, setColorWithOpacity] = useState("#34C759CC");

  return (
    <Section title="🎨 Color Pickers">
      <VStack spacing={16}>
        <Text style={{ fontSize: 14, color: "gray" }}>Basic Color Picker</Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={color1}
            label="Primary Color"
            onSelectionChange={setColor1}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(color1),
              cornerRadius(8),
            ]}
          >
            <View style={{ width: 40, height: 40 }} />
          </VStack>
        </HStack>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Selected: ${color1}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>Another Color Picker</Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={color2}
            label="Accent Color"
            onSelectionChange={setColor2}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(color2),
              cornerRadius(8),
            ]}
          >
            <View style={{ width: 40, height: 40 }} />
          </VStack>
        </HStack>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Selected: ${color2}`}</Text>

        <Text style={{ fontSize: 14, color: "gray" }}>With Opacity Support</Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={colorWithOpacity}
            label="Transparent Color"
            supportsOpacity={true}
            onSelectionChange={setColorWithOpacity}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(colorWithOpacity),
              cornerRadius(8),
            ]}
          >
            <View style={{ width: 40, height: 40 }} />
          </VStack>
        </HStack>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Selected: ${colorWithOpacity}`}</Text>
      </VStack>
    </Section>
  );
}
