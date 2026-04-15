import {
    DisclosureGroup,
    Section,
    Slider,
    Toggle,
    VStack,
} from "@expo/ui/swift-ui";
import React, { useState } from "react";
import { Text } from "react-native";

export function DisclosureGroupSection() {
  const [isExpanded1, setIsExpanded1] = useState(false);
  const [isExpanded2, setIsExpanded2] = useState(true);
  const [isExpanded3, setIsExpanded3] = useState(false);

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [volume, setVolume] = useState(0.7);

  return (
    <Section title="📂 Disclosure Groups">
      <VStack spacing={12}>
        <Text style={{ fontSize: 14, color: "gray" }}>Expandable Content Sections</Text>

        <DisclosureGroup
          label="General Settings"
          isExpanded={isExpanded1}
          onIsExpandedChange={setIsExpanded1}
        >
          <VStack spacing={8}>
            <Toggle isOn={notifications} label="Push Notifications" onIsOnChange={setNotifications} />
            <Toggle isOn={darkMode} label="Dark Mode" onIsOnChange={setDarkMode} />
          </VStack>
        </DisclosureGroup>

        <DisclosureGroup
          label="Audio Settings"
          isExpanded={isExpanded2}
          onIsExpandedChange={setIsExpanded2}
        >
          <VStack spacing={8}>
            <Text style={{ fontSize: 12, color: "gray" }}>Volume Level</Text>
            <Slider value={volume} onValueChange={setVolume} />
            <Text style={{ fontSize: 12, color: "gray" }}>{`Volume: ${Math.round(volume * 100)}%`}</Text>
          </VStack>
        </DisclosureGroup>

        <DisclosureGroup
          label="About This App"
          isExpanded={isExpanded3}
          onIsExpandedChange={setIsExpanded3}
        >
          <VStack spacing={4}>
            <Text style={{ fontSize: 12, color: "gray" }}>Expo UI Playground</Text>
            <Text style={{ fontSize: 12, color: "gray" }}>Version 1.0.0</Text>
            <Text style={{ fontSize: 12, color: "gray" }}>Built with @expo/ui</Text>
          </VStack>
        </DisclosureGroup>

        <Text style={{ fontSize: 12, color: "gray" }}>
          {`Expanded sections: ${[isExpanded1 ? "General" : "", isExpanded2 ? "Audio" : "", isExpanded3 ? "About" : ""].filter(Boolean).join(", ") || "None"}`}
        </Text>
      </VStack>
    </Section>
  );
}
