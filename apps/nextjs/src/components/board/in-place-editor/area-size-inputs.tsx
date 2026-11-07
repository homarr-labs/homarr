"use client";

import { Group, NumberInput, Text } from "@mantine/core";

import { useAreaKeyboard } from "./keyboard";
import { addInPlaceActions, useAddInPlaceSession } from "./store";

export const AreaSizeInputs = ({ compact = false }: { compact?: boolean }) => {
  const session = useAddInPlaceSession();
  const onKeyDown = useAreaKeyboard();
  if (!session) return null;

  const { w, h } = session.area;

  return (
    <Group
      gap={6}
      wrap="nowrap"
      align="center"
      onKeyDownCapture={(event) => {
        if (event.altKey || event.shiftKey) onKeyDown(event);
      }}
    >
      {compact && (
        <Text size="xs" c="dimmed">
          Size
        </Text>
      )}
      <NumberInput
        size="sm"
        w={compact ? 44 : 64}
        hideControls={compact}
        min={1}
        max={24}
        allowDecimal={false}
        allowNegative={false}
        clampBehavior="strict"
        aria-label="Width"
        data-area-resize-shortcuts
        data-area-move-shortcuts
        inputMode="numeric"
        styles={{
          input: { fontSize: 16, textAlign: compact ? "center" : undefined, paddingInline: compact ? 4 : undefined },
          control: { minWidth: 24 },
        }}
        value={w}
        onChange={(value) => {
          if (typeof value === "number") addInPlaceActions.resizeTo(value, h);
        }}
      />
      <Text size="xs" c="dimmed" aria-hidden>
        ×
      </Text>
      <NumberInput
        size="sm"
        w={compact ? 44 : 64}
        hideControls={compact}
        min={1}
        max={24}
        allowDecimal={false}
        allowNegative={false}
        clampBehavior="strict"
        aria-label="Height"
        data-area-resize-shortcuts
        data-area-move-shortcuts
        inputMode="numeric"
        styles={{
          input: { fontSize: 16, textAlign: compact ? "center" : undefined, paddingInline: compact ? 4 : undefined },
          control: { minWidth: 24 },
        }}
        value={h}
        onChange={(value) => {
          if (typeof value === "number") addInPlaceActions.resizeTo(w, value);
        }}
      />
    </Group>
  );
};
