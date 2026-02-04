import {
    Button,
    ContextMenu,
    HStack,
    Section,
    Switch,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import {
    background,
    cornerRadius,
    frame,
    padding,
} from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";

export function ContextMenuSection() {
  const [showCompleted, setShowCompleted] = useState(true);
  const [lastAction, setLastAction] = useState("None");

  return (
    <Section title="📌 Context Menus">
      <VStack spacing={16}>
        <Text size={14} color="gray">
          Long press or tap the boxes below
        </Text>

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
              <Text size={16} color="white">
                Long press for options
              </Text>
            </HStack>
          </ContextMenu.Trigger>
          <ContextMenu.Items>
            <Button
              systemImage="star.fill"
              onPress={() => setLastAction("Favorite")}
            >
              Add to Favorites
            </Button>
            <Button
              systemImage="square.and.arrow.up"
              onPress={() => setLastAction("Share")}
            >
              Share
            </Button>
            <Button
              systemImage="doc.on.doc"
              onPress={() => setLastAction("Copy")}
            >
              Copy
            </Button>
            <Switch
              value={showCompleted}
              label="Show Completed"
              variant="checkbox"
              onValueChange={setShowCompleted}
            />
            <Button
              systemImage="trash"
              role="destructive"
              onPress={() => setLastAction("Delete")}
            >
              Delete
            </Button>
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
              <Text size={16} color="white">
                Another context menu
              </Text>
            </HStack>
          </ContextMenu.Trigger>
          <ContextMenu.Items>
            <Button systemImage="pencil" onPress={() => setLastAction("Edit")}>
              Edit
            </Button>
            <Button
              systemImage="arrow.clockwise"
              onPress={() => setLastAction("Refresh")}
            >
              Refresh
            </Button>
            <Button
              systemImage="info.circle"
              onPress={() => setLastAction("Info")}
            >
              Get Info
            </Button>
          </ContextMenu.Items>
        </ContextMenu>

        <Text size={12} color="gray">
          {`Last action: ${lastAction}`}
        </Text>
        <Text size={12} color="gray">
          {`Show completed: ${showCompleted ? "Yes" : "No"}`}
        </Text>
      </VStack>
    </Section>
  );
}
