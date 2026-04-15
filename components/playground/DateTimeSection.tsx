import {
    DatePicker,
    Picker,
    Section,
    Text as UIText,
    VStack,
} from "@expo/ui/swift-ui";
import { datePickerStyle, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Text } from "react-native";

export function DateTimeSection() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [variantIndex, setVariantIndex] = useState<number>(0);
  const [componentIndex, setComponentIndex] = useState<number>(0);

  const variants: Array<'automatic' | 'compact' | 'graphical' | 'wheel'> = ["automatic", "compact", "graphical", "wheel"];
  const componentLabels = ["Date", "Time"];
  const componentValues: Array<'date' | 'hourAndMinute'> = ["date", "hourAndMinute"];

  const currentVariant = variants[variantIndex] ?? 'automatic';
  const currentComponent = componentValues[componentIndex] ?? 'date';

  return (
    <Section title="📅 Date & Time">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Display Style</Text>
        <Picker
          selection={variantIndex}
          onSelectionChange={(v: number) => setVariantIndex(v)}
          modifiers={[pickerStyle('segmented')]}
        >
          {variants.map((label, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{label}</UIText>
          ))}
        </Picker>

        <Text style={{ fontSize: 14, color: "gray" }}>Components</Text>
        <Picker
          selection={componentIndex}
          onSelectionChange={(v: number) => setComponentIndex(v)}
          modifiers={[pickerStyle('segmented')]}
        >
          {componentLabels.map((label, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{label}</UIText>
          ))}
        </Picker>

        <Text style={{ fontSize: 14, color: "gray" }}>Date Picker</Text>
        <DatePicker
          title="Select Date"
          selection={selectedDate ?? undefined}
          displayedComponents={[currentComponent]}
          onDateChange={(date: Date) => setSelectedDate(date)}
          modifiers={[datePickerStyle(currentVariant)]}
        />

        <Text style={{ fontSize: 12, color: "gray" }}>
          {selectedDate ? `Selected: ${selectedDate.toLocaleString()}` : "No date selected"}
        </Text>
      </VStack>
    </Section>
  );
}
