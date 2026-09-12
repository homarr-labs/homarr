"use client";

import { useId, useMemo, useRef } from "react";
import type { PropsWithChildren, ReactNode } from "react";
import {
  Badge,
  Center,
  Group,
  NumberInput,
  Stack,
  Text,
  Tooltip,
  MantineProvider,
  Portal,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

import { useI18n } from "@homarr/translation/client";

import classes from "./modals/widget-edit-modal.module.css";

type Size = { width: number; height: number };

/** The same board grid controls and fitted canvas used by Edit Widget and package authoring. */
export function WidgetPreviewFrame({ dimensions, resize, children }: {
  dimensions: Size & { scale?: number };
  resize?: { size: Size; maximumSize: Size; onChange(size: Size): void };
  children(dimensions: Size & { scale: number }): ReactNode;
}) {
  const t = useI18n();
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const sourceWidth = Math.max(dimensions.width, 1);
  const sourceHeight = Math.max(dimensions.height, 1);
  let scale = dimensions.scale ?? 0.9;
  if (!Number.isFinite(scale) || scale <= 0) scale = 0.9;
  scale = Math.min(scale, 0.9);
  if (width > 0 && height > 0) scale = Math.min(width / sourceWidth, height / sourceHeight, scale);
  const change = (dimension: keyof Size, value: string | number) => {
    if (!resize || typeof value !== "number" || !Number.isFinite(value)) return;
    resize.onChange({ ...resize.size, [dimension]: Math.max(1, Math.min(Math.round(value), resize.maximumSize[dimension])) });
  };
  return (
    <Stack className={classes.previewPanel} gap={0}>
      <Center ref={ref} className={classes.previewCanvas}>
        {resize && (
          <Group className={classes.previewSizeControls} gap={6} wrap="nowrap">
            <Text size="xs" fw={600} c="dimmed">{t("item.edit.preview.size")}</Text>
            {(["width", "height"] as const).map((dimension) => (
              <Group key={dimension} gap={6} wrap="nowrap">
                {dimension === "height" && <Text size="xs" c="dimmed" aria-hidden>×</Text>}
                <Tooltip label={t(`item.moveResize.field.${dimension}.label`)}>
                  <NumberInput
                    className={classes.previewSizeInput}
                    aria-label={t(`item.moveResize.field.${dimension}.label`)}
                    value={resize.size[dimension]}
                    onChange={(value) => change(dimension, value)}
                    min={1}
                    max={resize.maximumSize[dimension]}
                    step={1}
                    allowDecimal={false}
                    allowNegative={false}
                    clampBehavior="strict"
                    size="xs"
                    leftSection={t(`item.moveResize.field.${dimension}.shortLabel`)}
                    leftSectionPointerEvents="none"
                  />
                </Tooltip>
              </Group>
            ))}
          </Group>
        )}
        <Badge className={classes.previewDimensions} size="xs" variant="light" color="gray">
          {Math.round(sourceWidth)} × {Math.round(sourceHeight)}
        </Badge>
        {children({ width: sourceWidth, height: sourceHeight, scale })}
      </Center>
    </Stack>
  );
}

/** Scope preview colors and portal variables without changing the user's application theme. */
export function WidgetPreviewViewport({
  children,
  colorScheme,
  width,
  height,
  scale,
}: PropsWithChildren<{
  colorScheme: "system" | "light" | "dark";
  width: number;
  height: number;
  scale: number;
}>) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/gu, "");
  const root = useRef<HTMLDivElement>(null);
  const currentScheme = useComputedColorScheme("light");
  const hostTheme = useMantineTheme();
  let scheme = currentScheme;
  if (colorScheme !== "system") scheme = colorScheme;
  const theme = useMemo(
    () => ({
      ...hostTheme,
      components: {
        ...hostTheme.components,
        Portal: Portal.extend({ defaultProps: { target: `#widget-preview-overlays-${id}` } }),
      },
    }),
    [hostTheme, id],
  );
  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={scheme}
      cssVariablesSelector={`[data-widget-preview-theme="${id}"]`}
      getRootElement={() => root.current ?? undefined}
      deduplicateCssVariables={false}
      withGlobalClasses={false}
    >
      <div
        ref={root}
        data-widget-preview-theme={id}
        data-mantine-color-scheme={scheme}
        style={{
          width: width * scale,
          height: height * scale,
          background: "var(--mantine-color-body)",
          color: "var(--mantine-color-text)",
        }}
      >
        <div style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
      </div>
      <div id={`widget-preview-overlays-${id}`} data-widget-preview-theme={id} data-mantine-color-scheme={scheme} />
    </MantineProvider>
  );
}
