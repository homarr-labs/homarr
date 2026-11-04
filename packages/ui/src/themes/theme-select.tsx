"use client";

import type { SelectProps } from "@mantine/core";
import { Group, Select, Text } from "@mantine/core";

import type { ThemeId } from "@homarr/definitions";
import { isThemeId, themeIds, themeNames } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { getThemePreset } from "./registry";

interface ThemeSelectProps extends Omit<SelectProps, "data" | "value" | "onChange"> {
  value: ThemeId | null;
  onChange: (value: ThemeId | null) => void;
  inherit?: boolean;
}

export const ThemeSelect = ({ value, onChange, inherit = false, ...props }: ThemeSelectProps) => {
  const t = useI18n("common.customTheme");
  const data: { value: string; label: string }[] = themeIds.map((id) => ({ value: id, label: themeNames[id] }));
  let description = t("serverDescription");
  if (inherit) {
    data.unshift({ value: "server", label: t("serverDefault") });
    description = t("userDescription");
  }

  return (
    <Select
      label={t("label")}
      description={description}
      searchable
      allowDeselect={false}
      nothingFoundMessage={t("nothingFound")}
      comboboxProps={{ withinPortal: true }}
      {...props}
      data={data}
      value={value ?? "server"}
      onChange={(next) => {
        if (next === "server") onChange(null);
        else if (isThemeId(next)) onChange(next);
      }}
      renderOption={({ option }) => {
        const preset = getThemePreset(option.value as ThemeId);
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
