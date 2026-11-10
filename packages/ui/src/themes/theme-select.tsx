"use client";

import type { SelectProps } from "@mantine/core";
import { Group, Select, Text } from "@mantine/core";

import { isThemeId, themeIds, themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import type { ThemeSelectionId } from "@homarr/validation/theme";

import { getThemePreset } from "./registry";

interface ThemeSelectProps extends Omit<SelectProps, "data" | "value" | "onChange"> {
  value: ThemeSelectionId;
  onChange: (value: ThemeSelectionId) => void;
  hasCustomTheme?: boolean;
}

export const ThemeSelect = ({ value, onChange, hasCustomTheme = false, ...props }: ThemeSelectProps) => {
  const t = useI18n("common.customTheme");
  const data: { value: string; label: string }[] = themeIds.map((id) => ({ value: id, label: themeNames[id] }));
  if (hasCustomTheme) data.unshift({ value: "custom", label: t("custom") });

  return (
    <Select
      label={t("label")}
      searchable
      allowDeselect={false}
      nothingFoundMessage={t("nothingFound")}
      comboboxProps={{ withinPortal: true }}
      {...props}
      data={data}
      value={value}
      onChange={(next) => {
        if ((next === "custom" && hasCustomTheme) || isThemeId(next)) onChange(next);
      }}
      renderOption={({ option }) => {
        const preset = getThemePreset(isThemeId(option.value) ? option.value : "default");
        let background = "var(--mantine-color-default-hover)";
        let color = "var(--mantine-color-text)";
        if (preset) {
          background = `light-dark(${preset.light.body}, ${preset.dark.body})`;
          color = `light-dark(${preset.light.primary}, ${preset.dark.primary})`;
        }
        return (
          <Group gap="sm" wrap="nowrap">
            <Text
              component="span"
              fw={700}
              size="sm"
              px="xs"
              py={4}
              bg={background}
              c={color}
              style={{ borderRadius: "var(--mantine-radius-sm)", fontFamily: preset?.theme?.fontFamily }}
              aria-hidden
            >
              Aa
            </Text>
            <Text size="sm">{option.label}</Text>
          </Group>
        );
      }}
    />
  );
};
