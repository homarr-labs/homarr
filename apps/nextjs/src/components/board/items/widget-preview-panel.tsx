"use client";

import { Suspense, use } from "react";
import { Center, Loader, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconZoomIn } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { WidgetError } from "@homarr/widgets/errors";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

const PANEL_WIDTH = 320;

const MAX_PREVIEW_HEIGHT = 260;

const fitInBounds = (minHeight: number, width: number, height: number, maxWidth: number, maxHeight: number) => {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  const scaledWidth = Math.min(Math.max(width * scale, 160), maxWidth);
  const scaledHeight = Math.min(Math.max(height * scale, minHeight), maxHeight);
  return { width: scaledWidth, height: scaledHeight };
};

export const getPreviewSize = (kind: WidgetKind) => {
  const base = widgetDefaultSizes[kind] ?? { width: 1, height: 1 };
  return fitInBounds(140, base.width * 56, base.height * 56, PANEL_WIDTH - 32, MAX_PREVIEW_HEIGHT);
};

interface WidgetPreviewPanelProps {
  kind: WidgetKind | null;
  integrationIds: string[];
  options?: Record<string, unknown>;
  label?: string;
}

export const WidgetPreviewPanel = ({ kind, integrationIds, options, label }: WidgetPreviewPanelProps) => {
  const t = useI18n();

  return (
    <Paper withBorder radius="md" p="sm" shadow="sm" h="100%" style={{ overflow: "hidden" }}>
      <Text size="xs" c="dimmed" mb="xs" fw={600} tt="uppercase" truncate>
        {label ?? t("item.create.preview.label")}
      </Text>
      {kind ? <PreviewContent kind={kind} integrationIds={integrationIds} options={options} /> : <Placeholder />}
    </Paper>
  );
};

const Placeholder = () => {
  const t = useI18n();

  return (
    <Center h="calc(100% - 26px)" c="dimmed">
      <Stack gap="xs" align="center">
        <ThemeIcon variant="light" size="lg" radius="xl">
          <IconZoomIn size={20} />
        </ThemeIcon>
        <Text size="sm" c="dimmed" ta="center" px="md">
          {t("item.create.preview.placeholder")}
        </Text>
      </Stack>
    </Center>
  );
};

const PreviewContent = ({
  kind,
  integrationIds,
  options,
}: {
  kind: WidgetKind;
  integrationIds: string[];
  options?: Record<string, unknown>;
}) => {
  const { width, height } = getPreviewSize(kind);

  return (
    <Center h="calc(100% - 26px)" style={{ pointerEvents: "none" }}>
      <Suspense
        fallback={
          <Center h={height}>
            <Loader size="sm" />
          </Center>
        }
      >
        <InnerPreview kind={kind} integrationIds={integrationIds} options={options} width={width} height={height} />
      </Suspense>
    </Center>
  );
};

const InnerPreview = ({
  kind,
  integrationIds,
  options,
  width,
  height,
}: {
  kind: WidgetKind;
  integrationIds: string[];
  options?: Record<string, unknown>;
  width: number;
  height: number;
}) => {
  const settings = useSettings();
  const { definition, Component } = use(loadWidgetResources(kind));
  const defaultOptions = reduceWidgetOptionsWithDefinition(definition, settings, {});
  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
          )}
        >
          <Stack w={width} h={height} style={{ overflow: "hidden" }}>
            <Component
              options={mergedOptions as never}
              integrationIds={integrationIds}
              width={width}
              height={height}
              isEditMode={false}
              boardId={undefined}
              itemId={undefined}
              setOptions={() => undefined}
            />
          </Stack>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
