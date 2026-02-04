import { ColorPicker, HStack, Section, Text, VStack } from "@expo/ui/swift-ui";
import { background, cornerRadius, frame } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";

export function ColorPickerSection() {
  const [color1, setColor1] = useState("#007AFF");
  const [color2, setColor2] = useState("#FF3B30");
  const [colorWithOpacity, setColorWithOpacity] = useState("#34C759CC");

  return (
    <Section title="🎨 Color Pickers">
      <VStack spacing={16}>
        <Text size={14} color="gray">
          Basic Color Picker
        </Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={color1}
            label="Primary Color"
            onValueChanged={setColor1}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(color1),
              cornerRadius(8),
            ]}
          >
            <Text size={1}> </Text>
          </VStack>
        </HStack>
        <Text size={12} color="gray">
          {`Selected: ${color1}`}
        </Text>

        <Text size={14} color="gray">
          Another Color Picker
        </Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={color2}
            label="Accent Color"
            onValueChanged={setColor2}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(color2),
              cornerRadius(8),
            ]}
          >
            <Text size={1}> </Text>
          </VStack>
        </HStack>
        <Text size={12} color="gray">
          {`Selected: ${color2}`}
        </Text>

        <Text size={14} color="gray">
          With Opacity Support
        </Text>
        <HStack spacing={12}>
          <ColorPicker
            selection={colorWithOpacity}
            label="Transparent Color"
            supportsOpacity={true}
            onValueChanged={setColorWithOpacity}
          />
          <VStack
            modifiers={[
              frame({ width: 40, height: 40 }),
              background(colorWithOpacity),
              cornerRadius(8),
            ]}
          >
            <Text size={1}> </Text>
          </VStack>
        </HStack>
        <Text size={12} color="gray">
          {`Selected: ${colorWithOpacity}`}
        </Text>
      </VStack>
    </Section>
  );
}
