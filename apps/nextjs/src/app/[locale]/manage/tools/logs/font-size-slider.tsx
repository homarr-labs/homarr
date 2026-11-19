"use client";

import { Group, Slider, Text } from "@mantine/core";
import { IconTextSize } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { useLogContext } from "./log-context";

export const LogFontSizeSlider = () => {
  const { fontSize, setFontSize } = useLogContext();
  const t = useI18n("log");

  return (
    <Group gap="xs" wrap="nowrap" w={160}>
      <IconTextSize size={18} style={{ flexShrink: 0 }} />
      <Slider
        thumbLabel={t("fontSize")}
        min={10}
        max={24}
        step={1}
        value={fontSize}
        onChange={setFontSize}
        label={(val) => `${val}px`}
        style={{ flex: 1 }}
        size="xs"
      />
      <Text size="xs" c="dimmed" w={32} ta="right">
        {fontSize}px
      </Text>
    </Group>
  );
};
