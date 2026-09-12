"use client";

import { Group, NumberInput, Select, Stack } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { usePackageWorkspace } from "./_use-package-workspace";

const presets = {
  compact: { width: 320, height: 260 },
  wide: { width: 640, height: 320 },
  phone: { width: 390, height: 640 },
  tablet: { width: 768, height: 540 },
};

export function PackagePreviewControls({ state }: { state: ReturnType<typeof usePackageWorkspace> }) {
  const t = useI18n("customWidget.package");
  const { width, height, scale, previewTheme, setWidth, setHeight, setScale, setPreviewTheme } = state;
  const labels = {
    compact: t("viewportcompact"),
    wide: t("viewportwide"),
    phone: t("viewportphone"),
    tablet: t("viewporttablet"),
  };
  let preset = "custom";
  for (const [name, size] of Object.entries(presets)) {
    if (size.width === width && size.height === height) preset = name;
  }
  return (
    <Stack gap="xs">
      <Group gap="xs" grow>
        <Select
          size="xs"
          label={t("previewViewport")}
          value={preset}
          data={[
            { value: "custom", label: t("viewportCustom") },
            ...Object.entries(labels).map(([value, label]) => ({ value, label })),
          ]}
          onChange={(value) => {
            if (!value || !Object.hasOwn(presets, value)) return;
            const size = presets[value as keyof typeof presets];
            setWidth(size.width);
            setHeight(size.height);
          }}
        />
        <Select
          size="xs"
          label={t("previewTheme")}
          value={previewTheme}
          data={[
            { value: "system", label: t("previewThemeCurrent") },
            { value: "light", label: t("previewThemeLight") },
            { value: "dark", label: t("previewThemeDark") },
          ]}
          onChange={(value) => {
            if (value === "system" || value === "light" || value === "dark") setPreviewTheme(value);
          }}
        />
      </Group>
      <Group gap="xs" grow>
        <NumberInput
          size="xs"
          label={t("width")}
          min={100}
          max={2400}
          value={width}
          onChange={(value) => {
            if (typeof value === "number") setWidth(value);
          }}
        />
        <NumberInput
          size="xs"
          label={t("height")}
          min={100}
          max={1600}
          value={height}
          onChange={(value) => {
            if (typeof value === "number") setHeight(value);
          }}
        />
        <NumberInput
          size="xs"
          label={t("previewScale")}
          min={25}
          max={200}
          suffix="%"
          step={10}
          value={Math.round(scale * 100)}
          onChange={(value) => {
            if (typeof value === "number") setScale(Math.min(2, Math.max(0.25, value / 100)));
          }}
        />
      </Group>
    </Stack>
  );
}
