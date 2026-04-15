import {
    ContentUnavailableView,
    Picker,
    Section,
    Text as UIText,
    VStack,
} from "@expo/ui/swift-ui";
import { frame, pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import React, { useState } from "react";
import { Button, Text } from "react-native";

export function ContentUnavailableSection() {
  const [selectedView, setSelectedView] = useState<number>(0);
  const [showContent, setShowContent] = useState(false);

  const viewTypes = ["No Results", "No Network", "Empty State"];

  const renderUnavailableView = () => {
    if (showContent) {
      return (
        <VStack spacing={8}>
          <Text style={{ fontSize: 14 }}>Content is now available! 🎉</Text>
          <Button onPress={() => setShowContent(false)} title="Hide Content" />
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
        <Text style={{ fontSize: 14, color: "gray" }}>Select a state to preview</Text>

        <Picker
          selection={selectedView}
          onSelectionChange={(v: number) => {
            setSelectedView(v);
            setShowContent(false);
          }}
          modifiers={[pickerStyle('segmented')]}
        >
          {viewTypes.map((label, i) => (
            <UIText key={i} modifiers={[tag(i)]}>{label}</UIText>
          ))}
        </Picker>

        {renderUnavailableView()}

        {!showContent && (
          <Button onPress={() => setShowContent(true)} title="Load Content" />
        )}
      </VStack>
    </Section>
  );
}
