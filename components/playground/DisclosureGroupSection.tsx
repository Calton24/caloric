import {
    DisclosureGroup,
    Section,
    Slider,
    Switch,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import React, { useState } from "react";

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
        <Text size={14} color="gray">
          Expandable Content Sections
        </Text>

        <DisclosureGroup
          label="General Settings"
          isExpanded={isExpanded1}
          onStateChange={setIsExpanded1}
        >
          <VStack spacing={8}>
            <Switch
              value={notifications}
              label="Push Notifications"
              onValueChange={setNotifications}
            />
            <Switch
              value={darkMode}
              label="Dark Mode"
              onValueChange={setDarkMode}
            />
          </VStack>
        </DisclosureGroup>

        <DisclosureGroup
          label="Audio Settings"
          isExpanded={isExpanded2}
          onStateChange={setIsExpanded2}
        >
          <VStack spacing={8}>
            <Text size={12} color="gray">
              Volume Level
            </Text>
            <Slider value={volume} onValueChange={setVolume} />
            <Text size={12} color="gray">
              {`Volume: ${Math.round(volume * 100)}%`}
            </Text>
          </VStack>
        </DisclosureGroup>

        <DisclosureGroup
          label="About This App"
          isExpanded={isExpanded3}
          onStateChange={setIsExpanded3}
        >
          <VStack spacing={4}>
            <Text size={12} color="gray">
              Expo UI Playground
            </Text>
            <Text size={12} color="gray">
              Version 1.0.0
            </Text>
            <Text size={12} color="gray">
              Built with @expo/ui
            </Text>
          </VStack>
        </DisclosureGroup>

        <Text size={12} color="gray">
          {`Expanded sections: ${[isExpanded1 ? "General" : "", isExpanded2 ? "Audio" : "", isExpanded3 ? "About" : ""].filter(Boolean).join(", ") || "None"}`}
        </Text>
      </VStack>
    </Section>
  );
}
