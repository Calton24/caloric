import {
    Button,
    CircularProgress,
    HStack,
    LinearProgress,
    Section,
    Text,
    VStack,
} from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import React, { useEffect, useState } from "react";

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
        <Text size={14} color="gray">
          Indeterminate Progress
        </Text>
        <HStack spacing={24}>
          <VStack spacing={4} alignment="center">
            <CircularProgress modifiers={[frame({ width: 40, height: 40 })]} />
            <Text size={10} color="gray">
              Circular
            </Text>
          </VStack>
          <VStack spacing={4} alignment="center">
            <LinearProgress modifiers={[frame({ width: 120 })]} />
            <Text size={10} color="gray">
              Linear
            </Text>
          </VStack>
        </HStack>

        <Text size={14} color="gray">
          Determinate Progress
        </Text>
        <HStack spacing={24}>
          <VStack spacing={4} alignment="center">
            <CircularProgress
              progress={progress}
              color="blue"
              modifiers={[frame({ width: 50, height: 50 })]}
            />
            <Text
              size={10}
              color="gray"
            >{`${Math.round(progress * 100)}%`}</Text>
          </VStack>
          <VStack spacing={4}>
            <LinearProgress
              progress={progress}
              color="green"
              modifiers={[frame({ width: 150 })]}
            />
            <Text size={10} color="gray">
              Linear Progress
            </Text>
          </VStack>
        </HStack>

        <Text size={14} color="gray">
          Custom Colors
        </Text>
        <HStack spacing={16}>
          <CircularProgress
            progress={0.3}
            color="red"
            modifiers={[frame({ width: 40, height: 40 })]}
          />
          <CircularProgress
            progress={0.5}
            color="orange"
            modifiers={[frame({ width: 40, height: 40 })]}
          />
          <CircularProgress
            progress={0.7}
            color="green"
            modifiers={[frame({ width: 40, height: 40 })]}
          />
          <CircularProgress
            progress={0.9}
            color="blue"
            modifiers={[frame({ width: 40, height: 40 })]}
          />
        </HStack>

        <Button onPress={() => setIsAnimating(!isAnimating)}>
          {isAnimating ? "Pause Animation" : "Resume Animation"}
        </Button>
      </VStack>
    </Section>
  );
}
