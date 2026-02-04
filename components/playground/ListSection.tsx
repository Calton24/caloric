import {
    Button,
    List,
    Picker,
    Section,
    Switch,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function ListSection() {
  const [items, setItems] = useState([
    "🍎 Apple",
    "🍌 Banana",
    "🍊 Orange",
    "🍇 Grape",
    "🍓 Strawberry",
  ]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  const [listStyleIndex, setListStyleIndex] = useState<number | null>(0);

  const listStyles = ["automatic", "plain", "inset", "insetGrouped", "grouped"];

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMove = (from: number, to: number) => {
    setItems((prev) => {
      const newItems = [...prev];
      const [movedItem] = newItems.splice(from, 1);
      newItems.splice(to, 0, movedItem);
      return newItems;
    });
  };

  const resetItems = () => {
    setItems([
      "🍎 Apple",
      "🍌 Banana",
      "🍊 Orange",
      "🍇 Grape",
      "🍓 Strawberry",
    ]);
    setSelectedIndices([]);
  };

  return (
    <Section title="📝 Lists">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          List Style
        </Text>
        <Picker
          options={listStyles}
          selectedIndex={listStyleIndex}
          variant="segmented"
          onOptionSelected={(e) => setListStyleIndex(e.nativeEvent.index)}
        />

        <Switch
          value={editModeEnabled}
          label="Edit Mode"
          onValueChange={setEditModeEnabled}
        />

        <Text size={14} color="gray">
          Swipe to delete, drag to reorder (in edit mode)
        </Text>

        <List
          listStyle={
            listStyleIndex !== null
              ? (listStyles[listStyleIndex] as
                  | "automatic"
                  | "plain"
                  | "inset"
                  | "insetGrouped"
                  | "grouped")
              : "automatic"
          }
          selectEnabled={true}
          moveEnabled={editModeEnabled}
          deleteEnabled={true}
          editModeEnabled={editModeEnabled}
          onDeleteItem={handleDelete}
          onMoveItem={handleMove}
          onSelectionChange={setSelectedIndices}
        >
          {items.map((item, index) => (
            <Text key={index} size={16}>
              {item}
            </Text>
          ))}
        </List>

        <Text size={12} color="gray">
          {`Items: ${items.length}`}
        </Text>
        <Text size={12} color="gray">
          {`Selected: ${selectedIndices.length > 0 ? selectedIndices.map((i) => items[i]).join(", ") : "None"}`}
        </Text>

        <Button variant="bordered" onPress={resetItems}>
          Reset List
        </Button>
      </VStack>
    </Section>
  );
}
