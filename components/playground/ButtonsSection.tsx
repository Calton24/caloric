import { Button, Section, VStack } from "@expo/ui/swift-ui";
import React from "react";
import { Text } from "react-native";

export function ButtonsSection() {
  const handlePress = (variant: string) => {
    console.log(`Pressed: ${variant}`);
  };

  return (
    <Section title="🔘 Buttons">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Button Variants</Text>
        <Button label="Default Button" onPress={() => handlePress("default")} />
        <Button label="Bordered Button" onPress={() => handlePress("bordered")} />
        <Button label="Bordered Prominent" onPress={() => handlePress("borderedProminent")} />
        <Button label="Borderless Button" onPress={() => handlePress("borderless")} />
        <Button label="Plain Button" onPress={() => handlePress("plain")} />
        <Text style={{ fontSize: 14, color: "gray" }}>Button Roles</Text>
        <Button role="cancel" label="Cancel Button" onPress={() => handlePress("cancel")} />
        <Button role="destructive" label="Destructive Button" onPress={() => handlePress("destructive")} />
        <Text style={{ fontSize: 14, color: "gray" }}>Button with Icons</Text>
        <Button systemImage="star.fill" label="Favorite" onPress={() => handlePress("icon")} />
        <Button systemImage="camera" label="Take Photo" onPress={() => handlePress("camera")} />
      </VStack>
    </Section>
  );
}
