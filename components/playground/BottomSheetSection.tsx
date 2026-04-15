import {
    BottomSheet,
    Button,
    Section,
    Slider,
    Toggle,
    VStack,
} from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text } from "react-native";

export function BottomSheetSection() {
  const [isOpened, setIsOpened] = useState(false);
  const [isLargeOpened, setIsLargeOpened] = useState(false);
  const [isCustomOpened, setIsCustomOpened] = useState(false);
  const [sheetValue, setSheetValue] = useState(0.5);
  const [sheetToggle, setSheetToggle] = useState(true);

  return (
    <Section title="📋 Bottom Sheets">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Sheet Sizes</Text>

        <Button label="Open Medium Sheet" onPress={() => setIsOpened(true)} />
        <Button label="Open Large Sheet" onPress={() => setIsLargeOpened(true)} />
        <Button label="Open Custom Height (40%)" onPress={() => setIsCustomOpened(true)} />

        {/* Medium Sheet */}
        <BottomSheet
          isPresented={isOpened}
          onIsPresentedChange={setIsOpened}
        >
          <VStack spacing={16}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>Medium Sheet</Text>
            <Text style={{ fontSize: 14, color: "gray" }}>This is a medium-sized bottom sheet.</Text>
            <Toggle isOn={sheetToggle} label="Toggle Option" onIsOnChange={setSheetToggle} />
            <Slider value={sheetValue} onValueChange={setSheetValue} />
            <Text style={{ fontSize: 12, color: "gray" }}>{`Slider value: ${sheetValue.toFixed(2)}`}</Text>
            <Button label="Close Sheet" onPress={() => setIsOpened(false)} />
          </VStack>
        </BottomSheet>

        {/* Large Sheet */}
        <BottomSheet
          isPresented={isLargeOpened}
          onIsPresentedChange={setIsLargeOpened}
        >
          <VStack spacing={16}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>Large Sheet</Text>
            <Text style={{ fontSize: 14, color: "gray" }}>This sheet takes up most of the screen.</Text>
            <Button label="Dismiss" onPress={() => setIsLargeOpened(false)} />
          </VStack>
        </BottomSheet>

        {/* Custom Height Sheet */}
        <BottomSheet
          isPresented={isCustomOpened}
          onIsPresentedChange={setIsCustomOpened}
        >
          <VStack spacing={16}>
            <Text style={{ fontSize: 20, fontWeight: "bold" }}>Custom Sheet</Text>
            <Text style={{ fontSize: 14, color: "gray" }}>This sheet starts at 40% height.</Text>
            <Button role="destructive" label="Close" onPress={() => setIsCustomOpened(false)} />
          </VStack>
        </BottomSheet>
      </VStack>
    </Section>
  );
}
