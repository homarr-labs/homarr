"use client";

/* eslint-disable react/no-unstable-nested-components -- Widget fallbacks are definition-bound. */

import type { ComponentType, CSSProperties, PropsWithChildren } from "react";
import { useElementSize } from "@mantine/hooks";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

import { IntegrationProvider } from "@homarr/auth/client";
import { useOptionalBoard } from "@homarr/boards/context";
import type { WidgetKind } from "@homarr/definitions";
import { SpotlightProvider } from "@homarr/spotlight";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { WidgetComponentProps, WidgetDefinition } from "../definition";
import { WidgetError } from "../errors/component";
import type { IntegrationSelectOption } from "../widget-integration-select";
import { WidgetCardShell, WidgetTitleBadge } from "../widget-card-shell";
import classes from "./widget-edit-modal.module.css";

export const PreviewRuntimeBoundary = ({
  Wrapper,
  children,
}: PropsWithChildren<{ Wrapper?: ComponentType<PropsWithChildren> }>) => {
  if (!Wrapper) return children;
  return <Wrapper>{children}</Wrapper>;
};

export interface WidgetLivePreviewProps {
  kind: WidgetKind;
  Component: ComponentType<WidgetComponentProps<WidgetKind>>;
  definition: WidgetDefinition;
  options: Record<string, unknown>;
  integrationIds: string[];
  advancedOptions: BoardItemAdvancedOptions;
  integrationData: IntegrationSelectOption[];
  fallbackWidth: number;
  fallbackHeight: number;
  displayScale: number;
  itemId?: string;
  boardId?: string;
  isEditMode?: boolean;
  onChangeOptions: (newOptions: Record<string, unknown>) => void;
  PreviewWrapper?: ComponentType<PropsWithChildren>;
  shellClassName?: string;
  shellStyle?: CSSProperties;
}

export const WidgetLivePreview = ({
  kind,
  Component,
  definition,
  options,
  integrationIds,
  advancedOptions,
  integrationData,
  fallbackWidth,
  fallbackHeight,
  displayScale,
  itemId,
  boardId,
  isEditMode = false,
  onChangeOptions,
  PreviewWrapper,
  shellClassName,
  shellStyle,
}: WidgetLivePreviewProps) => {
  const board = useOptionalBoard();
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const previewOpacity = (board?.opacity ?? 100) / 100;
  const previewIntegrations = integrationData
    .filter((integration) => integrationIds.includes(integration.id))
    .map((integration) => ({
      id: integration.id,
      permissions: integration.permissions ?? {
        hasFullAccess: false,
        hasInteractAccess: false,
        hasUseAccess: false,
      },
    }));

  return (
    <WidgetCardShell
      innerRef={ref}
      className={shellClassName ?? classes.previewWidget}
      kind={kind}
      advancedOptions={advancedOptions}
      opacity={previewOpacity}
      radius={board?.itemRadius}
      p={0}
      data-grid-item-content
      style={shellStyle}
    >
      <WidgetTitleBadge advancedOptions={advancedOptions} opacity={previewOpacity} radius={board?.itemRadius} />
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary
            onReset={reset}
            resetKeys={[options, integrationIds]}
            fallbackRender={({ resetErrorBoundary, error }) => (
              <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
            )}
          >
            <PreviewRuntimeBoundary Wrapper={PreviewWrapper}>
              <SpotlightProvider>
                <IntegrationProvider integrations={previewIntegrations}>
                  <div className={classes.previewContent} inert>
                    <Component
                      options={options as never}
                      integrationIds={integrationIds}
                      width={width || fallbackWidth}
                      height={height || fallbackHeight}
                      displayScale={displayScale}
                      isEditMode={isEditMode}
                      displayMode="compact"
                      boardId={boardId}
                      itemId={itemId}
                      setOptions={({ newOptions }) => onChangeOptions(newOptions as Record<string, unknown>)}
                    />
                  </div>
                </IntegrationProvider>
              </SpotlightProvider>
            </PreviewRuntimeBoundary>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </WidgetCardShell>
  );
};
