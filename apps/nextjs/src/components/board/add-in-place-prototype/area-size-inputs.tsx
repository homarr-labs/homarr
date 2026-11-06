"use client";

import { Group, NumberInput, Text } from "@mantine/core";

import { addInPlaceActions, useAddInPlaceSession } from "./store";

export const AreaSizeInputs = () => {
  const session = useAddInPlaceSession();
  if (!session) return null;

  const { w, h } = session.area;

  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <NumberInput
        size="xs"
        w={64}
        min={1}
        max={24}
        allowDecimal={false}
        allowNegative={false}
        clampBehavior="strict"
        aria-label="Width"
        value={w}
        onChange={(value) => {
          if (typeof value === "number") addInPlaceActions.resizeTo(value, h);
        }}
      />
      <Text size="xs" c="dimmed">
        ×
      </Text>
      <NumberInput
        size="xs"
        w={64}
        min={1}
        max={24}
        allowDecimal={false}
        allowNegative={false}
        clampBehavior="strict"
        aria-label="Height"
        value={h}
        onChange={(value) => {
          if (typeof value === "number") addInPlaceActions.resizeTo(w, value);
        }}
      />
    </Group>
  );
};
