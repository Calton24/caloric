import { Button, Section, Text, VStack } from "@expo/ui/swift-ui";
import React from "react";

export function ButtonsSection() {
  const handlePress = (variant: string) => {
    console.log(`Pressed: ${variant}`);
  };

  return (
    <Section title="🔘 Buttons">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Button Variants
        </Text>

        <Button onPress={() => handlePress("default")}>Default Button</Button>

        <Button variant="bordered" onPress={() => handlePress("bordered")}>
          Bordered Button
        </Button>

        <Button
          variant="borderedProminent"
          onPress={() => handlePress("borderedProminent")}
        >
          Bordered Prominent
        </Button>

        <Button variant="borderless" onPress={() => handlePress("borderless")}>
          Borderless Button
        </Button>

        <Button variant="plain" onPress={() => handlePress("plain")}>
          Plain Button
        </Button>

        <Text size={14} color="gray">
          Button Roles
        </Text>

        <Button role="cancel" onPress={() => handlePress("cancel")}>
          Cancel Button
        </Button>

        <Button role="destructive" onPress={() => handlePress("destructive")}>
          Destructive Button
        </Button>

        <Text size={14} color="gray">
          Button with Icons
        </Text>

        <Button systemImage="star.fill" onPress={() => handlePress("icon")}>
          Favorite
        </Button>

        <Button
          systemImage="camera"
          variant="bordered"
          onPress={() => handlePress("camera")}
        >
          Take Photo
        </Button>

        <Text size={14} color="gray">
          Button Sizes
        </Text>

        <Button controlSize="mini" onPress={() => handlePress("mini")}>
          Mini
        </Button>

        <Button controlSize="small" onPress={() => handlePress("small")}>
          Small
        </Button>

        <Button controlSize="regular" onPress={() => handlePress("regular")}>
          Regular
        </Button>

        <Button controlSize="large" onPress={() => handlePress("large")}>
          Large
        </Button>

        <Text size={14} color="gray">
          Custom Colors
        </Text>

        <Button
          color="red"
          variant="bordered"
          onPress={() => handlePress("red")}
        >
          Red Button
        </Button>

        <Button
          color="green"
          variant="bordered"
          onPress={() => handlePress("green")}
        >
          Green Button
        </Button>

        <Button
          color="blue"
          variant="borderedProminent"
          onPress={() => handlePress("blue")}
        >
          Blue Button
        </Button>
      </VStack>
    </Section>
  );
}
