import {
    List,
    Section,
    Text as UIText,
    VStack,
} from "@expo/ui/swift-ui";
import { tag } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Text, Button } from "react-native";

export function ListSection() {
  const [items, setItems] = useState([
    "🍎 Apple",
    "🍌 Banana",
    "🍊 Orange",
    "🍇 Grape",
    "🍓 Strawberry",
  ]);
  const [selectedTags, setSelectedTags] = useState<(string | number)[]>([]);

  const handleDelete = (indices: number[]) => {
    setItems((prev) => prev.filter((_, i) => !indices.includes(i)));
  };

  const handleMove = (sourceIndices: number[], destination: number) => {
    setItems((prev) => {
      const movedItems = sourceIndices.map((i) => prev[i]);
      const filtered = prev.filter((_, i) => !sourceIndices.includes(i));
      filtered.splice(destination, 0, ...movedItems);
      return filtered;
    });
  };

  const resetItems = () => {
    setItems(["🍎 Apple", "🍌 Banana", "🍊 Orange", "🍇 Grape", "🍓 Strawberry"]);
    setSelectedTags([]);
  };

  return (
    <Section title="📝 Lists">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Swipe to delete, drag to reorder</Text>

        <List
          selection={selectedTags}
          onSelectionChange={setSelectedTags}
        >
          <List.ForEach
            onDelete={handleDelete}
            onMove={handleMove}
          >
            {items.map((item, index) => (
              <UIText key={index} modifiers={[tag(index)]}>{item}</UIText>
            ))}
          </List.ForEach>
        </List>

        <Text style={{ fontSize: 12, color: "gray" }}>{`Items: ${items.length}`}</Text>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Selected: ${selectedTags.length > 0 ? selectedTags.map((t) => items[t as number]).join(", ") : "None"}`}</Text>
        <Button onPress={resetItems} title="Reset List" />
      </VStack>
    </Section>
  );
}
