import { haptics } from "@/src/infrastructure/haptics";
import { Section, Slider, Text, VStack } from "@expo/ui/swift-ui";
import React, { useCallback, useRef, useState } from "react";

/**
 * Fires a selection haptic when the snapped value changes.
 * `snapInterval` controls the discretization (e.g. 0.05 = 20 ticks across 0–1).
 */
function useHapticSlider(
  initial: number,
  onChange: (v: number) => void,
  snapInterval: number
) {
  const lastSnap = useRef(Math.round(initial / snapInterval));

  const handleChange = useCallback(
    (v: number) => {
      const currentSnap = Math.round(v / snapInterval);
      if (currentSnap !== lastSnap.current) {
        lastSnap.current = currentSnap;
        haptics.selection();
      }
      onChange(v);
    },
    [onChange, snapInterval]
  );

  return handleChange;
}

export function SliderSection() {
  const [value1, setValue1] = useState(0.5);
  const [value2, setValue2] = useState(50);
  const [steppedValue, setSteppedValue] = useState(5);

  // Haptic on every ~5% of range
  const handleValue1 = useHapticSlider(value1, setValue1, 0.05);
  // Haptic on every 5 units (0–100 range)
  const handleValue2 = useHapticSlider(value2, setValue2, 5);
  // Haptic on every step (integer)
  const handleStepped = useHapticSlider(steppedValue, setSteppedValue, 1);
  // Colored slider shares range with value1
  const handleColored = useHapticSlider(value1, setValue1, 0.05);

  return (
    <Section title="🎚️ Sliders">
      <VStack spacing={12}>
        <Text size={14} color="gray">
          Basic Slider (0 to 1)
        </Text>
        <Slider value={value1} onValueChange={handleValue1} />
        <Text size={12} color="gray">
          {`Value: ${value1.toFixed(2)}`}
        </Text>

        <Text size={14} color="gray">
          Range Slider (0 to 100)
        </Text>
        <Slider value={value2} min={0} max={100} onValueChange={handleValue2} />
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
          onValueChange={handleStepped}
        />
        <Text size={12} color="gray">
          {`Step: ${Math.round(steppedValue)} of 10`}
        </Text>

        <Text size={14} color="gray">
          Colored Slider
        </Text>
        <Slider value={value1} color="orange" onValueChange={handleColored} />
      </VStack>
    </Section>
  );
}
