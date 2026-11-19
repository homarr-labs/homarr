"use client";

import type { ReactNode } from "react";
import type { MantineTheme } from "@mantine/core";
import { ActionIcon, Box, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { IconArrowBackUp } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { CustomTheme } from "@homarr/validation/theme";
import type { ThemeControl } from "@homarr/validation/theme-controls";
import { getThemeControlValue, themeControls } from "@homarr/validation/theme-controls";

import { themeLengthPixels } from "./theme-length";

const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
const spacingProfiles = {
  compact: [8, 10, 12, 16, 24],
  normal: [10, 12, 16, 20, 32],
  roomy: [12, 16, 20, 24, 40],
};
const radiusProfiles = {
  none: [0, 0, 0, 0, 0],
  rounded: [6, 8, 12, 16, 24],
  full: [9999, 9999, 9999, 9999, 9999],
};
type Change = { path: string; value: string | null };

export const ThemeLayoutControls = ({
  document,
  effective,
  disabled,
  onChange,
  renderControl,
  advanced = false,
}: {
  document: CustomTheme;
  effective: MantineTheme;
  disabled: boolean;
  onChange: (changes: Change[]) => void;
  renderControl: (control: ThemeControl) => ReactNode;
  advanced?: boolean;
}) => {
  const t = useI18n("common.customTheme.studio");
  const hasOverride = (field: "spacing" | "radius") =>
    sizes.some((size) => getThemeControlValue(document, `theme.${field}.${size}`) !== undefined) ||
    (field === "radius" && document.theme.defaultRadius !== undefined);
  const reset = (field: "spacing" | "radius") => {
    const changes: Change[] = sizes.map((size) => ({ path: `theme.${field}.${size}`, value: null }));
    if (field === "radius") changes.push({ path: "theme.defaultRadius", value: null });
    onChange(changes);
  };
  const matchProfile = (field: "spacing" | "radius", profiles: Record<string, number[]>) => {
    if (field === "radius" && !hasOverride(field)) return "preset";
    if (field === "radius" && effective.defaultRadius !== "md") return "custom";
    return (
      Object.entries(profiles).find(([, values]) =>
        sizes.every((size, index) => themeLengthPixels(effective[field][size]) === values[index]),
      )?.[0] ?? "custom"
    );
  };
  const applyProfile = (field: "spacing" | "radius", profiles: Record<string, number[]>, id: string) => {
    if (id === "preset") return reset(field);
    const values = profiles[id];
    if (!values) return;
    const changes: Change[] = sizes.map((size, index) => ({
      path: `theme.${field}.${size}`,
      value: `${(values[index] ?? 0) / 16}rem`,
    }));
    if (field === "radius") changes.push({ path: "theme.defaultRadius", value: "md" });
    onChange(changes);
  };
  const renderProfile = (field: "spacing" | "radius", profiles: Record<string, number[]>) => {
    const selected = matchProfile(field, profiles);
    const options = Object.keys(profiles).map((value) => ({ value, label: t(`layout.${value}` as never) }));
    if (field === "radius") options.unshift({ value: "preset", label: t("layout.preset") });
    const data: { value: string; label: string; disabled?: boolean }[] = options;
    if (selected === "custom") data.push({ value: "custom", label: t("layout.custom"), disabled: true });
    const label = t(`layout.${field}`);
    return (
      <Box component="fieldset" bd={0} p={0} m={0} miw={0}>
        <Text component="legend" size="sm" fw={500} mb={4}>
          {label}
        </Text>
        <Group gap="xs" wrap="nowrap" align="center">
          <SegmentedControl
            flex={1}
            miw={0}
            size="xs"
            fullWidth
            data={data}
            value={selected}
            disabled={disabled}
            onChange={(value) => applyProfile(field, profiles, value)}
            styles={{ label: { paddingInline: 5 } }}
          />
          <ActionIcon
            size="input-sm"
            variant="subtle"
            disabled={disabled || !hasOverride(field)}
            aria-label={t("resetControl", { control: label })}
            onClick={() => reset(field)}
          >
            <IconArrowBackUp size={16} />
          </ActionIcon>
        </Group>
      </Box>
    );
  };
  const controls = themeControls.filter((control) => control.group === "layout");
  if (advanced) return <Stack gap="sm">{controls.map(renderControl)}</Stack>;
  return (
    <Stack gap="sm">
      {renderProfile("spacing", spacingProfiles)}
      {renderProfile("radius", radiusProfiles)}
    </Stack>
  );
};
