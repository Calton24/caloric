import {
    HStack,
    ProgressView,
    Section,
    VStack,
} from "@expo/ui/swift-ui";
import { frame, progressViewStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useEffect, useState } from "react";
import { Button, Text } from "react-native";

export function ProgressSection() {
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newValue = prev + 0.02;
        return newValue > 1 ? 0 : newValue;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <Section title="⏳ Progress Indicators">
      <VStack spacing={16}>
        <Text style={{ fontSize: 14, color: "gray" }}>Indeterminate Progress</Text>
        <HStack spacing={24}>
          <VStack spacing={4} alignment="center">
            <ProgressView modifiers={[progressViewStyle("circular"), frame({ width: 40, height: 40 })]} />
            <Text style={{ fontSize: 10, color: "gray" }}>Circular</Text>
          </VStack>
          <VStack spacing={4} alignment="center">
            <ProgressView modifiers={[progressViewStyle("linear"), frame({ width: 120 })]} />
            <Text style={{ fontSize: 10, color: "gray" }}>Linear</Text>
          </VStack>
        </HStack>

        <Text style={{ fontSize: 14, color: "gray" }}>Determinate Progress</Text>
        <HStack spacing={24}>
          <VStack spacing={4} alignment="center">
            <ProgressView
              value={progress}
              modifiers={[progressViewStyle("circular"), frame({ width: 50, height: 50 })]}
            />
            <Text style={{ fontSize: 10, color: "gray" }}>{`${Math.round(progress * 100)}%`}</Text>
          </VStack>
          <VStack spacing={4}>
            <ProgressView
              value={progress}
              modifiers={[progressViewStyle("linear"), frame({ width: 150 })]}
            />
            <Text style={{ fontSize: 10, color: "gray" }}>Linear Progress</Text>
          </VStack>
        </HStack>

        <Text style={{ fontSize: 14, color: "gray" }}>Multiple Progress Indicators</Text>
        <HStack spacing={16}>
          <ProgressView value={0.3} modifiers={[progressViewStyle("circular"), frame({ width: 40, height: 40 })]} />
          <ProgressView value={0.5} modifiers={[progressViewStyle("circular"), frame({ width: 40, height: 40 })]} />
          <ProgressView value={0.7} modifiers={[progressViewStyle("circular"), frame({ width: 40, height: 40 })]} />
          <ProgressView value={0.9} modifiers={[progressViewStyle("circular"), frame({ width: 40, height: 40 })]} />
        </HStack>

        <Button
          onPress={() => setIsAnimating(!isAnimating)}
          title={isAnimating ? "Pause Animation" : "Resume Animation"}
        />
      </VStack>
    </Section>
  );
}
