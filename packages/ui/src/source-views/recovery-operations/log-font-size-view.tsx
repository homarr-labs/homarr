"use client";

import { Group, Slider, Text } from "@mantine/core";
import { IconTextSize } from "@tabler/icons-react";

import type { LogFontSizeViewProps } from "./contracts";

export const LogFontSizeView = ({ fontSize, onChange }: LogFontSizeViewProps) => (
  <Group gap="xs" wrap="nowrap" w={160}>
    <IconTextSize size={18} style={{ flexShrink: 0 }} />
    <Slider
      min={10}
      max={24}
      step={1}
      value={fontSize}
      onChange={onChange}
      label={(val) => `${val}px`}
      style={{ flex: 1 }}
      size="xs"
    />
    <Text size="xs" c="dimmed" w={32} ta="right">
      {fontSize}px
    </Text>
  </Group>
);
