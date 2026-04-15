import {
    Button,
    ContextMenu,
    HStack,
    Section,
    Toggle,
    VStack,
} from "@expo/ui/swift-ui";
import {
    background,
    cornerRadius,
    frame,
    padding,
} from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Text } from "react-native";

export function ContextMenuSection() {
  const [showCompleted, setShowCompleted] = useState(true);
  const [lastAction, setLastAction] = useState("None");

  return (
    <Section title="📌 Context Menus">
      <VStack spacing={16}>
        <Text style={{ fontSize: 14, color: "gray" }}>Long press or tap the boxes below</Text>

        <ContextMenu>
          <ContextMenu.Trigger>
            <HStack
              modifiers={[
                frame({ height: 80 }),
                background("#007AFF"),
                cornerRadius(12),
                padding({ all: 16 }),
              ]}
            >
              <Text style={{ fontSize: 16, color: "white" }}>Long press for options</Text>
            </HStack>
          </ContextMenu.Trigger>
          <ContextMenu.Items>
            <Button
              systemImage="star.fill"
              label="Add to Favorites"
              onPress={() => setLastAction("Favorite")}
            />
            <Button
              systemImage="square.and.arrow.up"
              label="Share"
              onPress={() => setLastAction("Share")}
            />
            <Button
              systemImage="doc.on.doc"
              label="Copy"
              onPress={() => setLastAction("Copy")}
            />
            <Toggle
              isOn={showCompleted}
              label="Show Completed"
              onIsOnChange={setShowCompleted}
            />
            <Button
              systemImage="trash"
              role="destructive"
              label="Delete"
              onPress={() => setLastAction("Delete")}
            />
          </ContextMenu.Items>
        </ContextMenu>

        <ContextMenu>
          <ContextMenu.Trigger>
            <HStack
              modifiers={[
                frame({ height: 80 }),
                background("#34C759"),
                cornerRadius(12),
                padding({ all: 16 }),
              ]}
            >
              <Text style={{ fontSize: 16, color: "white" }}>Another context menu</Text>
            </HStack>
          </ContextMenu.Trigger>
          <ContextMenu.Items>
            <Button systemImage="pencil" label="Edit" onPress={() => setLastAction("Edit")} />
            <Button systemImage="arrow.clockwise" label="Refresh" onPress={() => setLastAction("Refresh")} />
            <Button systemImage="info.circle" label="Get Info" onPress={() => setLastAction("Info")} />
          </ContextMenu.Items>
        </ContextMenu>

        <Text style={{ fontSize: 12, color: "gray" }}>{`Last action: ${lastAction}`}</Text>
        <Text style={{ fontSize: 12, color: "gray" }}>{`Show completed: ${showCompleted ? "Yes" : "No"}`}</Text>
      </VStack>
    </Section>
  );
}
