import { Gauge, HStack, Section, Text, VStack } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import React, { useEffect, useState } from "react";

export function GaugeSection() {
  const [progress, setProgress] = useState(0.65);

  // Simulate changing values
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newValue = prev + 0.05;
        return newValue > 1 ? 0 : newValue;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Section title="📊 Gauges">
      <VStack spacing={16}>
        <Text size={14} color="gray">
          Circular Gauges
        </Text>
        <HStack spacing={16}>
          <VStack spacing={4} alignment="center">
            <Gauge
              current={{
                value: progress,
                label: `${Math.round(progress * 100)}%`,
              }}
              type="circular"
              color="blue"
              modifiers={[frame({ width: 80, height: 80 })]}
            />
            <Text size={10} color="gray">
              Circular
            </Text>
          </VStack>

          <VStack spacing={4} alignment="center">
            <Gauge
              current={{
                value: progress,
                label: `${Math.round(progress * 100)}%`,
              }}
              type="circularCapacity"
              color="green"
              modifiers={[frame({ width: 80, height: 80 })]}
            />
            <Text size={10} color="gray">
              Capacity
            </Text>
          </VStack>
        </HStack>

        <Text size={14} color="gray">
          Linear Gauges
        </Text>
        <VStack spacing={12}>
          <Gauge
            current={{ value: progress }}
            min={{ value: 0, label: "0%" }}
            max={{ value: 1, label: "100%" }}
            type="linear"
            color="purple"
            label="Linear Gauge"
          />

          <Gauge
            current={{ value: 0.75 }}
            type="linearCapacity"
            color="orange"
            label="Storage Used"
          />
        </VStack>

        <Text size={14} color="gray">
          Gradient Gauge
        </Text>
        <Gauge
          current={{ value: progress, label: `${Math.round(progress * 100)}%` }}
          type="circular"
          color={["#FF6B6B", "#FFE66D", "#4ECDC4"]}
          modifiers={[frame({ width: 100, height: 100 })]}
        />
      </VStack>
    </Section>
  );
}
