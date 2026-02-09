import { Form, Group, Host, Image } from "@expo/ui/swift-ui";
import {
    cornerRadius,
    frame,
    glassEffect,
    onTapGesture,
    shadow,
} from "@expo/ui/swift-ui/modifiers";
import React from "react";
import { StyleSheet, View } from "react-native";

import { BottomSheetSection } from "@/components/playground/BottomSheetSection";
import { ButtonsSection } from "@/components/playground/ButtonsSection";
import { ColorPickerSection } from "@/components/playground/ColorPickerSection";
import { ContentUnavailableSection } from "@/components/playground/ContentUnavailableSection";
import { ContextMenuSection } from "@/components/playground/ContextMenuSection";
import { DateTimeSection } from "@/components/playground/DateTimeSection";
import { DisclosureGroupSection } from "@/components/playground/DisclosureGroupSection";
import { GaugeSection } from "@/components/playground/GaugeSection";
import { ListSection } from "@/components/playground/ListSection";
import { PickerSection } from "@/components/playground/PickerSection";
import { ProgressSection } from "@/components/playground/ProgressSection";
import { SliderSection } from "@/components/playground/SliderSection";
import { SwitchSection } from "@/components/playground/SwitchSection";
import { TextFieldSection } from "@/components/playground/TextFieldSection";

export default function PlaygroundScreen() {
  const handleSearch = () => {
    console.log("Search button pressed!");
  };

  return (
    <View style={{ flex: 1 }}>
      <Host style={{ flex: 1 }}>
        <Form>
          <ButtonsSection />
          <SwitchSection />
          <SliderSection />
          <PickerSection />
          <TextFieldSection />
          <ColorPickerSection />
          <GaugeSection />
          <DateTimeSection />
          <ProgressSection />
          <BottomSheetSection />
          <ContextMenuSection />
          <ListSection />
          <ContentUnavailableSection />
          <DisclosureGroupSection />
        </Form>
      </Host>

      {/* Floating Search Button - inline with tab bar */}
      <View style={[styles.floatingButton, { bottom: 0, right: 16 }]}>
        <Host matchContents>
          <Group
            modifiers={[
              frame({ width: 56, height: 56 }),
              cornerRadius(28),
              glassEffect({
                glass: { variant: "regular", interactive: true },
                shape: "circle",
              }),
              shadow({ radius: 12, x: 0, y: 4, color: "rgba(0, 0, 0, 0.3)" }),
              onTapGesture(handleSearch),
            ]}
          >
            <Image systemName="magnifyingglass" size={22} />
          </Group>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
  },
});
