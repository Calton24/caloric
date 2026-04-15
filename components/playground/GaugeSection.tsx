import { Gauge, HStack, Section, VStack } from "@expo/ui/swift-ui";
import { frame, gaugeStyle } from "@expo/ui/swift-ui/modifiers";
import React, { useEffect, useState } from "react";
import { Text } from "react-native";

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
        <Text style={{ fontSize: 14, color: "gray" }}>Circular Gauges</Text>
        <HStack spacing={16}>
          <VStack spacing={4} alignment="center">
            <Gauge
              value={progress}
              currentValueLabel={<Text style={{ fontSize: 10 }}>{`${Math.round(progress * 100)}%`}</Text>}
              modifiers={[gaugeStyle("circular"), frame({ width: 80, height: 80 })]}
            />
            <Text style={{ fontSize: 10, color: "gray" }}>Circular</Text>
          </VStack>

          <VStack spacing={4} alignment="center">
            <Gauge
              value={progress}
              currentValueLabel={<Text style={{ fontSize: 10 }}>{`${Math.round(progress * 100)}%`}</Text>}
              modifiers={[gaugeStyle("circularCapacity"), frame({ width: 80, height: 80 })]}
            />
            <Text style={{ fontSize: 10, color: "gray" }}>Capacity</Text>
          </VStack>
        </HStack>

        <Text style={{ fontSize: 14, color: "gray" }}>Linear Gauges</Text>
        <VStack spacing={12}>
          <Gauge
            value={progress}
            min={0}
            max={1}
            currentValueLabel={<Text style={{ fontSize: 10 }}>{`${Math.round(progress * 100)}%`}</Text>}
            minimumValueLabel={<Text style={{ fontSize: 10 }}>0%</Text>}
            maximumValueLabel={<Text style={{ fontSize: 10 }}>100%</Text>}
            modifiers={[gaugeStyle("linear")]}
          >
            <Text style={{ fontSize: 12 }}>Linear Gauge</Text>
          </Gauge>

          <Gauge
            value={0.75}
            modifiers={[gaugeStyle("linearCapacity")]}
          >
            <Text style={{ fontSize: 12 }}>Storage Used</Text>
          </Gauge>
        </VStack>

        <Text style={{ fontSize: 14, color: "gray" }}>Gradient Gauge</Text>
        <Gauge
          value={progress}
          currentValueLabel={<Text style={{ fontSize: 12 }}>{`${Math.round(progress * 100)}%`}</Text>}
          modifiers={[gaugeStyle("circular"), frame({ width: 100, height: 100 })]}
        />
      </VStack>
    </Section>
  );
}
