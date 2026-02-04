import {
    BottomSheet,
    Button,
    Section,
    Slider,
    Switch,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function BottomSheetSection() {
  const [isOpened, setIsOpened] = useState(false);
  const [isLargeOpened, setIsLargeOpened] = useState(false);
  const [isCustomOpened, setIsCustomOpened] = useState(false);
  const [sheetValue, setSheetValue] = useState(0.5);
  const [sheetToggle, setSheetToggle] = useState(true);

  return (
    <Section title="📋 Bottom Sheets">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Sheet Sizes
        </Text>

        <Button onPress={() => setIsOpened(true)}>Open Medium Sheet</Button>

        <Button onPress={() => setIsLargeOpened(true)}>Open Large Sheet</Button>

        <Button onPress={() => setIsCustomOpened(true)}>
          Open Custom Height (40%)
        </Button>

        {/* Medium Sheet */}
        <BottomSheet
          isOpened={isOpened}
          onIsOpenedChange={setIsOpened}
          presentationDetents={["medium"]}
          presentationDragIndicator="visible"
        >
          <VStack spacing={16}>
            <Text size={20} weight="bold">
              Medium Sheet
            </Text>
            <Text size={14} color="gray">
              This is a medium-sized bottom sheet. You can add any content here.
            </Text>
            <Switch
              value={sheetToggle}
              label="Toggle Option"
              onValueChange={setSheetToggle}
            />
            <Slider value={sheetValue} onValueChange={setSheetValue} />
            <Text size={12} color="gray">
              {`Slider value: ${sheetValue.toFixed(2)}`}
            </Text>
            <Button
              variant="borderedProminent"
              onPress={() => setIsOpened(false)}
            >
              Close Sheet
            </Button>
          </VStack>
        </BottomSheet>

        {/* Large Sheet */}
        <BottomSheet
          isOpened={isLargeOpened}
          onIsOpenedChange={setIsLargeOpened}
          presentationDetents={["large"]}
          presentationDragIndicator="visible"
        >
          <VStack spacing={16}>
            <Text size={20} weight="bold">
              Large Sheet
            </Text>
            <Text size={14} color="gray">
              This sheet takes up most of the screen. Great for complex forms or
              content.
            </Text>
            <Text size={14} color="gray">
              You can scroll down for more content...
            </Text>
            <Button variant="bordered" onPress={() => setIsLargeOpened(false)}>
              Dismiss
            </Button>
          </VStack>
        </BottomSheet>

        {/* Custom Height Sheet */}
        <BottomSheet
          isOpened={isCustomOpened}
          onIsOpenedChange={setIsCustomOpened}
          presentationDetents={[0.4, "medium", "large"]}
          presentationDragIndicator="automatic"
        >
          <VStack spacing={16}>
            <Text size={20} weight="bold">
              Custom Sheet
            </Text>
            <Text size={14} color="gray">
              This sheet starts at 40% height but can be dragged to medium or
              large.
            </Text>
            <Button role="destructive" onPress={() => setIsCustomOpened(false)}>
              Close
            </Button>
          </VStack>
        </BottomSheet>
      </VStack>
    </Section>
  );
}
