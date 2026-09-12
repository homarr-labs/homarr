"use client";

import { Accordion, Group, NumberInput, Select, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { usePackageWorkspace } from "./_use-package-workspace";

export function PackagePreviewControls({ state }: { state: ReturnType<typeof usePackageWorkspace> }) {
  const t = useI18n("customWidget.package");
  const { width, height, scale, previewTheme, setWidth, setHeight, setScale, setPreviewTheme } = state;
  return (
    <Stack gap="xs">
      <Group gap="xs" grow>
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
      <Accordion>
        <Accordion.Item value="dimensions">
          <Accordion.Control>{t("customViewport")}</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">{t("customViewportDescription")}</Text>
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
                  max={90}
                  suffix="%"
                  step={10}
                  value={Math.round(scale * 100)}
                  onChange={(value) => {
                    if (typeof value === "number") setScale(Math.min(0.9, Math.max(0.25, value / 100)));
                  }}
                />
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
