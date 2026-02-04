import { Section, Slider, Text, VStack } from "@expo/ui/swift-ui";
import React, { useState } from "react";

export function SliderSection() {
  const [value1, setValue1] = useState(0.5);
  const [value2, setValue2] = useState(50);
  const [steppedValue, setSteppedValue] = useState(5);

  return (
    <Section title="🎚️ Sliders">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Basic Slider (0 to 1)
        </Text>
        <Slider value={value1} onValueChange={setValue1} />
        <Text size={12} color="gray">
          {`Value: ${value1.toFixed(2)}`}
        </Text>

        <Text size={14} color="gray">
          Range Slider (0 to 100)
        </Text>
        <Slider value={value2} min={0} max={100} onValueChange={setValue2} />
        <Text size={12} color="gray">
          {`Value: ${Math.round(value2)}`}
        </Text>

        <Text size={14} color="gray">
          Stepped Slider (10 steps)
        </Text>
        <Slider
          value={steppedValue}
          min={0}
          max={10}
          steps={10}
          onValueChange={setSteppedValue}
        />
        <Text size={12} color="gray">
          {`Step: ${Math.round(steppedValue)} of 10`}
        </Text>

        <Text size={14} color="gray">
          Colored Slider
        </Text>
        <Slider value={value1} color="orange" onValueChange={setValue1} />
      </VStack>
    </Section>
  );
}
