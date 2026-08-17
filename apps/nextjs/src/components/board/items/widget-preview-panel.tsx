"use client";

import { Suspense, use } from "react";
import { Center, Loader, Paper, Stack, Text } from "@mantine/core";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { WidgetError } from "@homarr/widgets/errors";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

const PREVIEW_CELL_SIZE = 56;
const PREVIEW_MIN_HEIGHT = 120;
const PREVIEW_MAX_HEIGHT = 260;

export const getPreviewSize = (kind: WidgetKind) => {
  const defaultSize = widgetDefaultSizes[kind] ?? { width: 1, height: 1 };
  return {
    width: Math.max(140, defaultSize.width * PREVIEW_CELL_SIZE),
    height: Math.min(PREVIEW_MAX_HEIGHT, Math.max(PREVIEW_MIN_HEIGHT, defaultSize.height * PREVIEW_CELL_SIZE)),
  };
};

interface WidgetPreviewProps {
  kind: WidgetKind;
  integrationIds: string[];
}

export const WidgetPreviewPanel = ({ kind, integrationIds }: WidgetPreviewProps) => {
  const t = useI18n();
  const { width, height } = getPreviewSize(kind);

  return (
    <Paper withBorder radius="md" p="sm" shadow="sm" h="100%" style={{ overflow: "hidden" }}>
      <Text size="xs" c="dimmed" mb="xs" fw={600} tt="uppercase">
        {t("item.create.preview.label")}
      </Text>
      <Center h={`calc(100% - 26px)`} style={{ pointerEvents: "none" }}>
        <Suspense
          fallback={
            <Center h={height}>
              <Loader size="sm" />
            </Center>
          }
        >
          <WidgetPreviewContent kind={kind} integrationIds={integrationIds} width={width} height={height} />
        </Suspense>
      </Center>
    </Paper>
  );
};

const WidgetPreviewContent = ({
  kind,
  integrationIds,
  width,
  height,
}: {
  kind: WidgetKind;
  integrationIds: string[];
  width: number;
  height: number;
}) => {
  const settings = useSettings();
  const { definition, Component } = use(loadWidgetResources(kind));
  const options = reduceWidgetOptionsWithDefinition(definition, settings, {});

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
              options={options as never}
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
