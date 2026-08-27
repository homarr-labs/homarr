import type { ComponentType, CSSProperties, MutableRefObject, PropsWithChildren } from "react";
import { memo, Suspense, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Box, Button, Center, Loader, Portal } from "@mantine/core";
import { useElementSize, useIsomorphicEffect } from "@mantine/hooks";
import { QueryErrorResetBoundary, useIsFetching, useQueryClient } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import type { FallbackProps } from "react-error-boundary";
import { ErrorBoundary } from "react-error-boundary";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getWidgetName } from "@homarr/definitions";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { WidgetError } from "@homarr/widgets/errors";
import {
  createWidgetRuntimeState,
  getWidgetQueryKeys,
  getWidgetRuntimeQueries,
  supportsAdvancedFocus as definitionSupportsAdvancedFocus,
} from "@homarr/widgets/definition";
import type { WidgetComponentProps, WidgetDefinition, WidgetRuntimeRef } from "@homarr/widgets/definition";
import { loadWidgetResources, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";
import { WidgetCardShell, WidgetTitleBadge } from "@homarr/widgets/widget-card-shell";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { getLogicalTrackSize } from "~/components/board/layout";
import { useBoardCanvasScale } from "~/components/board/layout/scaled-board-canvas";
import advancedFocusClasses from "../advanced-focus/advanced-focus.module.css";
import { useAdvancedFocus } from "../advanced-focus/context";
import { startAdvancedFocusEntrance } from "../advanced-focus/entrance";
import { getAdvancedFocusClosePosition, getAdvancedFocusRect } from "../advanced-focus/geometry";
import { AdvancedFocusManualSurface } from "../advanced-focus/manual-surface";
import { redirectShiftWheel } from "../advanced-focus/wheel";
import { useBoardGridPortalHost } from "../sections/grid/grid-portal-host";
import { useItemActions } from "./item-actions";
import itemContentClasses from "./item-content.module.css";
import { WidgetContextMenu } from "./widget-context-menu";
import { removeWidgetDataQueries } from "./widget-query-recovery";
import { matchesWidgetItemQuery } from "./widget-query-scope";

const BoardItemMenu = dynamic(() => import("./item-menu").then((module) => module.BoardItemMenu), {
  ssr: false,
});

interface BoardItemContentProps {
  item: SectionItem;
}

type BoardItemCardProps = PropsWithChildren<{
  item: SectionItem;
  innerRef: (element: HTMLDivElement | null) => void;
}>;

const BoardItemCard = ({ item, innerRef, children }: BoardItemCardProps) => {
  const board = useRequiredBoard();

  return (
    <WidgetCardShell
      innerRef={innerRef}
      kind={item.kind}
      advancedOptions={item.advancedOptions}
      opacity={board.opacity / 100}
      w="100%"
      h="100%"
      data-grid-item-content
      radius={board.itemRadius}
      p={0}
    >
      {children}
    </WidgetCardShell>
  );
};

const WidgetDefinitionLoadError = ({
  error,
  resetErrorBoundary,
  item,
  innerRef,
}: FallbackProps & Pick<BoardItemCardProps, "item" | "innerRef">) => (
  <BoardItemCard item={item} innerRef={innerRef}>
    <Center h="100%">
      <WidgetError error={error} resetErrorBoundary={resetErrorBoundary} />
    </Center>
  </BoardItemCard>
);

export const BoardItemContent = ({ item }: BoardItemContentProps) => {
  const { ref, width: measuredWidth, height: measuredHeight } = useElementSize<HTMLDivElement>();
  const { getEntryRuntime } = useBoardGridPortalHost();
  const { widgetStateRef, widgetRuntimeRef } = getEntryRuntime(item.id, createBoardItemRuntime);
  const width = measuredWidth || getLogicalTrackSize(item.width);
  const height = measuredHeight || getLogicalTrackSize(item.height);

  return (
    <ErrorBoundary
      resetKeys={[item.kind]}
      fallbackRender={(fallbackProps) => <WidgetDefinitionLoadError {...fallbackProps} item={item} innerRef={ref} />}
    >
      <Suspense
        fallback={
          <BoardItemCard item={item} innerRef={ref}>
            <Center h="100%">
              <Loader size="sm" />
            </Center>
          </BoardItemCard>
        }
      >
        <LoadedBoardItemContent
          item={item}
          width={width}
          height={height}
          widgetStateRef={widgetStateRef}
          widgetRuntimeRef={widgetRuntimeRef}
          contentRef={ref}
        />
      </Suspense>
    </ErrorBoundary>
  );
};

const createBoardItemRuntime = () => ({
  widgetStateRef: { current: null } as MutableRefObject<Record<string, unknown> | null>,
  widgetRuntimeRef: { current: createWidgetRuntimeState() } as WidgetRuntimeRef,
});

interface LoadedBoardItemContentProps {
  item: SectionItem;
  width: number;
  height: number;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  widgetRuntimeRef: WidgetRuntimeRef;
  contentRef: (element: HTMLDivElement | null) => void;
}

const LoadedBoardItemContent = ({
  item,
  width,
  height,
  widgetStateRef,
  widgetRuntimeRef,
  contentRef,
}: LoadedBoardItemContentProps) => {
  const { definition, Component } = use(loadWidgetResources(item.kind));
  const sourceRef = useRef<HTMLDivElement>(null);
  const advancedFocusTriggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const previewEntranceFrameRef = useRef<number | null>(null);
  const board = useRequiredBoard();
  const boardCanvasScale = useBoardCanvasScale();
  const t = useI18n();
  const [isEditMode] = useEditMode();
  const settings = useSettings();
  const menuItem = useMemo(
    () => ({ ...item, options: reduceWidgetOptionsWithDefinition(definition, settings, item.options) }),
    [definition, item, settings],
  );
  const widgetQueryKeys = useMemo(() => getWidgetQueryKeys(definition, item.kind), [definition, item.kind]);
  const isWidgetRefreshing =
    useIsFetching({
      predicate: (query) =>
        query.state.data !== undefined &&
        matchesWidgetItemQuery(
          query.queryKey,
          widgetQueryKeys,
          {
            itemId: item.id,
            boardId: board.id,
            integrationIds: item.integrationIds,
            options: menuItem.options,
            runtimeQueries: getWidgetRuntimeQueries(widgetRuntimeRef),
          },
          definition.queryMatcher,
        ),
    }) > 0;
  const [manualSurface, setManualSurface] = useState<HTMLDivElement | null>(null);
  const [surfacePortalTarget, setSurfacePortalTarget] = useState<HTMLDivElement | null>(null);
  const { active, viewportSize, open, close, dismiss, hover, leave } = useAdvancedFocus();
  const { width: viewportWidth, height: viewportHeight } = viewportSize;
  const supportsAdvancedFocus = definitionSupportsAdvancedFocus(definition);
  const widgetName = getWidgetName(item.kind, t);
  const previewDimensions = useMemo(
    () => ({ width, height, scale: boardCanvasScale }),
    [boardCanvasScale, height, width],
  );
  const advancedViewLabel = t("item.advancedFocus.label", { widget: widgetName });
  const advancedViewId = `advanced-focus-${item.id}`;
  const activeFocus = supportsAdvancedFocus && active?.itemId === item.id ? active : null;
  const isAdvanced = activeFocus !== null;
  const advancedRect = activeFocus
    ? getAdvancedFocusRect(activeFocus.sourceRect, { width: viewportWidth, height: viewportHeight })
    : null;
  const closePosition = advancedRect ? getAdvancedFocusClosePosition(advancedRect, viewportWidth) : null;
  const isPreview = activeFocus?.activation === "preview";
  const isManual = activeFocus?.activation === "manual";

  useIsomorphicEffect(() => {
    if (!supportsAdvancedFocus) return;
    const target = document.createElement("div");
    target.className = advancedFocusClasses.surfacePortalTarget ?? "";
    setSurfacePortalTarget(target);
    return () => target.remove();
  }, [supportsAdvancedFocus]);

  useEffect(() => () => dismiss(item.id), [dismiss, item.id]);

  const openAdvancedView = () => {
    if (sourceRef.current)
      open(item.id, sourceRef.current, {
        activation: "manual",
        autofocusClose: true,
        restoreFocusTarget: advancedFocusTriggerRef.current ?? sourceRef.current,
      });
  };

  useEffect(() => {
    const surface = isManual ? manualSurface : cardRef.current;
    if (!isAdvanced || !surface) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.shiftKey) return;
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1;
      const delta = (event.deltaY || event.deltaX) * multiplier;
      if (!redirectShiftWheel(surface, event.target, delta)) return;
      event.preventDefault();
      event.stopPropagation();
    };

    surface.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => surface.removeEventListener("wheel", handleWheel, { capture: true });
  }, [isAdvanced, isManual, manualSurface]);

  const cancelPreviewEntrance = useCallback(() => {
    if (previewEntranceFrameRef.current === null) return;
    cancelAnimationFrame(previewEntranceFrameRef.current);
    previewEntranceFrameRef.current = null;
  }, []);

  const mountCompactHost = useCallback(
    (host: HTMLDivElement | null) => {
      if (!host || !surfacePortalTarget || isAdvanced) return;
      cancelPreviewEntrance();
      if (host.childNodes.length !== 1 || host.firstChild !== surfacePortalTarget) {
        host.replaceChildren(surfacePortalTarget);
      }
    },
    [cancelPreviewEntrance, isAdvanced, surfacePortalTarget],
  );

  const mountPreviewHost = useCallback(
    (host: HTMLDivElement | null) => {
      if (!host || !surfacePortalTarget || !isPreview) {
        if (!host) cancelPreviewEntrance();
        return;
      }

      if (activeFocus?.phase !== "visible") {
        host.append(surfacePortalTarget);
        return;
      }
      const card = cardRef.current;
      const readyClass = advancedFocusClasses.surfaceReady;
      if (!card || !readyClass) return;

      cancelPreviewEntrance();
      previewEntranceFrameRef.current = startAdvancedFocusEntrance(surfacePortalTarget, host, card, readyClass);
    },
    [activeFocus?.phase, cancelPreviewEntrance, isPreview, surfacePortalTarget],
  );

  const mountManualHost = useCallback(
    (host: HTMLDivElement | null) => {
      if (!host || !surfacePortalTarget || !isManual) return;
      cancelPreviewEntrance();
      host.append(surfacePortalTarget);
    },
    [cancelPreviewEntrance, isManual, surfacePortalTarget],
  );

  useEffect(() => cancelPreviewEntrance, [cancelPreviewEntrance]);

  const previewStyle =
    isPreview && advancedRect && activeFocus
      ? ({
          left: advancedRect.left,
          top: advancedRect.top,
          width: advancedRect.width,
          height: advancedRect.height,
          "--focus-translate-x": `${activeFocus.sourceRect.left - advancedRect.left}px`,
          "--focus-translate-y": `${activeFocus.sourceRect.top - advancedRect.top}px`,
          "--focus-scale-x": advancedRect.width > 0 ? activeFocus.sourceRect.width / advancedRect.width : 1,
          "--focus-scale-y": advancedRect.height > 0 ? activeFocus.sourceRect.height / advancedRect.height : 1,
        } as CSSProperties)
      : undefined;

  const widgetCard = (
    <WidgetCardShell
      innerRef={cardRef}
      kind={item.kind}
      advancedOptions={item.advancedOptions}
      opacity={isAdvanced ? 0.98 : board.opacity / 100}
      id={isPreview ? advancedViewId : undefined}
      role={isPreview ? "region" : undefined}
      aria-label={isPreview ? advancedViewLabel : undefined}
      data-advanced-focus-surface={isPreview || undefined}
      data-grid-item-content
      radius={board.itemRadius}
      p={isAdvanced ? undefined : 0}
      h={isManual ? "100%" : isAdvanced ? undefined : "100%"}
      w={isManual ? "100%" : isAdvanced ? undefined : "100%"}
      className={combineClasses(
        isPreview && advancedFocusClasses.surface,
        activeFocus?.phase === "closing" && isPreview && advancedFocusClasses.surfaceClosing,
      )}
      style={previewStyle}
    >
      <Box ref={contentRef} w="100%" h="100%" mih={0}>
        <ErrorBoundary
          resetKeys={[item]}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <div
              className={itemContentClasses.editModeInertContent}
              data-board-grid-inert-content={isEditMode ? "true" : undefined}
              inert={isEditMode}
            >
              <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
            </div>
          )}
        >
          <InnerContent
            item={item}
            width={width}
            height={height}
            displayScale={boardCanvasScale}
            widgetStateRef={widgetStateRef}
            widgetRuntimeRef={widgetRuntimeRef}
            displayMode={isAdvanced ? "advanced" : "compact"}
            definition={definition}
            Component={Component}
          />
        </ErrorBoundary>
      </Box>
      {isWidgetRefreshing && (
        <Box className={itemContentClasses.refreshIndicator} data-widget-refreshing aria-hidden>
          <Loader size="xs" />
        </Box>
      )}
    </WidgetCardShell>
  );

  return (
    <>
      {isEditMode && <BoardItemMenu item={menuItem} definition={definition} previewDimensions={previewDimensions} />}
      <WidgetContextMenu
        item={item}
        definition={definition}
        previewDimensions={previewDimensions}
        widgetStateRef={widgetStateRef}
        widgetRuntimeRef={widgetRuntimeRef}
        sourceRef={sourceRef}
      >
        <Box
          ref={sourceRef}
          w="100%"
          h="100%"
          data-advanced-focus-source
          data-advanced-focus-enabled={supportsAdvancedFocus || undefined}
          data-item-id={item.id}
          role={!isEditMode && supportsAdvancedFocus ? "group" : undefined}
          aria-label={!isEditMode && supportsAdvancedFocus ? widgetName : undefined}
          onPointerEnter={() => {
            if (supportsAdvancedFocus && sourceRef.current) hover(item.id, sourceRef.current);
          }}
          onPointerLeave={() => {
            if (supportsAdvancedFocus) leave(item.id);
          }}
          className={combineClasses(isAdvanced && advancedFocusClasses.sourcePlaceholder)}
        >
          {!isEditMode && supportsAdvancedFocus && (
            <Button
              ref={advancedFocusTriggerRef}
              type="button"
              size="compact-xs"
              className={itemContentClasses.advancedFocusTrigger}
              aria-expanded={isAdvanced}
              aria-controls={isAdvanced ? advancedViewId : undefined}
              aria-keyshortcuts="Shift+Control Shift+Meta"
              data-advanced-focus-trigger
              onClick={openAdvancedView}
            >
              {t("item.advancedFocus.open")}
            </Button>
          )}
          <div ref={mountCompactHost} className={advancedFocusClasses.surfaceHost}>
            {!supportsAdvancedFocus && widgetCard}
          </div>
          {surfacePortalTarget && createPortal(widgetCard, surfacePortalTarget)}
          {isPreview && (
            <Portal reuseTargetNode={false}>
              <div ref={mountPreviewHost} className={advancedFocusClasses.surfaceHostAdvanced} />
            </Portal>
          )}
          {isManual && activeFocus && advancedRect && closePosition && (
            <AdvancedFocusManualSurface
              opened={activeFocus.phase === "visible"}
              phase={activeFocus.phase}
              id={advancedViewId}
              label={advancedViewLabel}
              closeLabel={t("item.advancedFocus.close")}
              rect={advancedRect}
              closePosition={closePosition}
              sourceRect={activeFocus.sourceRect}
              radius={board.itemRadius}
              contentRef={setManualSurface}
              onClose={() => close()}
            >
              <div ref={mountManualHost} className={advancedFocusClasses.manualSurfaceMount} />
            </AdvancedFocusManualSurface>
          )}
        </Box>
      </WidgetContextMenu>
      {!isAdvanced && (
        <WidgetTitleBadge
          advancedOptions={item.advancedOptions}
          opacity={board.opacity / 100}
          radius={board.itemRadius}
        />
      )}
    </>
  );
};

interface InnerContentProps {
  item: SectionItem;
  width: number;
  height: number;
  displayScale: number;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  widgetRuntimeRef: WidgetRuntimeRef;
  displayMode: "compact" | "advanced";
  definition: WidgetDefinition;
  Component: ComponentType<WidgetComponentProps<SectionItem["kind"]>>;
}

const InnerContent = memo(function InnerContent({ item, definition, Component, ...dimensions }: InnerContentProps) {
  const settings = useSettings();
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const options = reduceWidgetOptionsWithDefinition(definition, settings, item.options);
  const { removeItem, updateItemOptions } = useItemActions();
  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    updateItemOptions({ itemId: item.id, newOptions });
  const widgetSupportsIntegrations =
    "supportedIntegrations" in definition && (definition.supportedIntegrations?.length ?? 0) >= 1;
  const queryClient = useQueryClient();
  const widgetQueryKeys = getWidgetQueryKeys(definition, item.kind);

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={() => {
            removeWidgetDataQueries(queryClient, widgetQueryKeys);
            reset();
          }}
          resetKeys={[item]}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <div
              className={itemContentClasses.editModeInertContent}
              data-board-grid-inert-content={isEditMode ? "true" : undefined}
              inert={isEditMode}
            >
              <WidgetError definition={definition} error={error} resetErrorBoundary={resetErrorBoundary} />
            </div>
          )}
        >
          <Throw
            error={new NoIntegrationSelectedError()}
            when={
              widgetSupportsIntegrations &&
              item.integrationIds.length === 0 &&
              (!("integrationsRequired" in definition) || definition.integrationsRequired !== false)
            }
          />
          <div
            className={itemContentClasses.editModeInertContent}
            data-board-grid-inert-content={isEditMode ? "true" : undefined}
            data-homarr-widget-ready={item.kind}
            inert={isEditMode}
          >
            <Component
              options={options as never}
              integrationIds={item.integrationIds}
              isEditMode={isEditMode}
              boardId={board.id}
              itemId={item.id}
              removeItem={() => removeItem({ itemId: item.id })}
              setOptions={(partialNewOptions) =>
                updateOptions({
                  newOptions: {
                    ...options,
                    ...partialNewOptions.newOptions,
                  },
                })
              }
              {...dimensions}
            />
          </div>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
});

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};
