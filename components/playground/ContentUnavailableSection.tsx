import {
    Button,
    ContentUnavailableView,
    Picker,
    Section,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";

export function ContentUnavailableSection() {
  const [selectedView, setSelectedView] = useState<number | null>(0);
  const [showContent, setShowContent] = useState(false);

  const viewTypes = ["No Results", "No Network", "Empty State"];

  const renderUnavailableView = () => {
    if (showContent) {
      return (
        <VStack spacing={8}>
          <Text size={14}>Content is now available! 🎉</Text>
          <Button onPress={() => setShowContent(false)}>Hide Content</Button>
        </VStack>
      );
    }

    switch (selectedView) {
      case 0:
        return (
          <ContentUnavailableView
            title="No Results"
            systemImage="magnifyingglass"
            description="Try adjusting your search or filter to find what you're looking for."
            modifiers={[frame({ height: 200 })]}
          />
        );
      case 1:
        return (
          <ContentUnavailableView
            title="No Network"
            systemImage="wifi.slash"
            description="Please check your internet connection and try again."
            modifiers={[frame({ height: 200 })]}
          />
        );
      case 2:
        return (
          <ContentUnavailableView
            title="No Items"
            systemImage="tray"
            description="Your list is empty. Add some items to get started."
            modifiers={[frame({ height: 200 })]}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Section title="🚫 Content Unavailable Views">
      <VStack spacing={16}>
        <Text size={14} color="gray">
          Select a state to preview
        </Text>

        <Picker
          options={viewTypes}
          selectedIndex={selectedView}
          variant="segmented"
          onOptionSelected={(e) => {
            setSelectedView(e.nativeEvent.index);
            setShowContent(false);
          }}
        />

        {renderUnavailableView()}

        {!showContent && (
          <Button variant="bordered" onPress={() => setShowContent(true)}>
            Load Content
          </Button>
        )}
      </VStack>
    </Section>
  );
}
