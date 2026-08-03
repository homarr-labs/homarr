import type { CSSProperties, KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Badge, Box, Card, Portal } from "@mantine/core";
import { useElementSize, useIsomorphicEffect, useViewportSize } from "@mantine/hooks";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import { ErrorBoundary } from "react-error-boundary";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { WidgetRuntimeRef } from "@homarr/widgets";
import {
  createWidgetRuntimeState,
  loadWidgetDynamic,
  reduceWidgetOptionsWithDefaultValues,
  supportsAdvancedFocus as definitionSupportsAdvancedFocus,
  widgetImports,
} from "@homarr/widgets";
import { WidgetError } from "@homarr/widgets/errors";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import advancedFocusClasses from "../advanced-focus/advanced-focus.module.css";
import { useAdvancedFocus } from "../advanced-focus/context";
import { getAdvancedFocusClosePosition, getAdvancedFocusRect } from "../advanced-focus/geometry";
import { AdvancedFocusManualSurface } from "../advanced-focus/manual-surface";
import { redirectShiftWheel } from "../advanced-focus/wheel";
import classes from "../sections/item.module.css";
import { useItemActions } from "./item-actions";
import itemContentClasses from "./item-content.module.css";
import { BoardItemMenu } from "./item-menu";
import { WidgetContextMenu } from "./widget-context-menu";
import { removePersistedWidgetQueries } from "./widget-query-recovery";

interface BoardItemContentProps {
  item: SectionItem;
}

const getOverflowFromKind = (kind: SectionItem["kind"]) => {
  if (kind === "iframe") return "hidden";
  if (kind === "systemResources") return "visible";
  return undefined;
};

export const BoardItemContent = ({ item }: BoardItemContentProps) => {
  const { ref: contentRef, width, height } = useElementSize<HTMLDivElement>();
  const sourceRef = useRef<HTMLDivElement>(null);
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const board = useRequiredBoard();
  const t = useI18n();
  const widgetName = t(`widget.${item.kind}.name`);
  const advancedViewLabel = t("item.advancedFocus.label", { widget: widgetName });
  const [isEditMode] = useEditMode();
  const widgetRuntimeRef = useRef(createWidgetRuntimeState());
  const cardRef = useRef<HTMLDivElement>(null);
  const [manualSurface, setManualSurface] = useState<HTMLDivElement | null>(null);
  const [surfacePortalTarget, setSurfacePortalTarget] = useState<HTMLDivElement | null>(null);
  const { active, open, close, dismiss, hover, leave } = useAdvancedFocus();
  const supportsAdvancedFocus = definitionSupportsAdvancedFocus(widgetImports[item.kind].definition);
  const advancedViewId = `advanced-focus-${item.id}`;
  const activeFocus = supportsAdvancedFocus && active?.itemId === item.id ? active : null;
  const isAdvanced = activeFocus !== null;
  const advancedRect = activeFocus
    ? getAdvancedFocusRect(activeFocus.sourceRect, { width: viewportWidth, height: viewportHeight })
    : null;
  const closePosition = advancedRect ? getAdvancedFocusClosePosition(advancedRect, viewportWidth) : null;
  const isPreview = activeFocus?.activation === "preview";
  const isManual = activeFocus?.activation === "manual";

  // Keep one widget subtree mounted while moving its stable portal target between the grid and viewport layers.
  // This preserves iframe/editor state and escapes Gridstack's transformed containing block.
  useIsomorphicEffect(() => {
    if (!supportsAdvancedFocus) return;
    const target = document.createElement("div");
    target.className = advancedFocusClasses.surfacePortalTarget ?? "";
    setSurfacePortalTarget(target);
    return () => target.remove();
  }, [supportsAdvancedFocus]);

  // Responsive layout changes remount grid items. Never leave their focus backdrop orphaned.
  useEffect(() => () => dismiss(item.id), [dismiss, item.id]);

  const openAdvanced = (autofocusClose = false) => {
    if (sourceRef.current) open(item.id, sourceRef.current, { activation: "manual", autofocusClose });
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.currentTarget !== event.target ||
      event.key !== "Enter" ||
      !event.shiftKey ||
      isEditMode ||
      !supportsAdvancedFocus
    )
      return;
    event.preventDefault();
    openAdvanced(true);
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

  const mountPortalTarget = (node: HTMLDivElement | null, activation: "compact" | "preview" | "manual") => {
    if (!node || !surfacePortalTarget) return;
    const shouldMount =
      (activation === "compact" && !isAdvanced) ||
      (activation === "preview" && isPreview) ||
      (activation === "manual" && isManual);
    if (shouldMount) node.append(surfacePortalTarget);
  };

  const previewStyle =
    isPreview && advancedRect
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
    <Card
      ref={cardRef}
      id={isPreview ? advancedViewId : undefined}
      role={isPreview ? "region" : undefined}
      aria-label={isPreview ? advancedViewLabel : undefined}
      data-advanced-focus-surface={isPreview || undefined}
      radius={board.itemRadius}
      p={isAdvanced ? undefined : 0}
      h={isManual ? "100%" : isAdvanced ? undefined : "100%"}
      w={isManual ? "100%" : isAdvanced ? undefined : "100%"}
      className={combineClasses(
        classes.itemCard,
        `${item.kind}-wrapper`,
        isPreview && advancedFocusClasses.surface,
        activeFocus?.phase === "closing" && isPreview && advancedFocusClasses.surfaceClosing,
        item.advancedOptions.customCssClasses.join(" "),
      )}
      styles={{
        root: {
          "--opacity": isAdvanced ? 0.98 : board.opacity / 100,
          containerType: "size",
          overflow: getOverflowFromKind(item.kind),
          "--border-color": item.advancedOptions.borderColor !== "" ? item.advancedOptions.borderColor : undefined,
        },
      }}
      style={previewStyle}
    >
      <Box ref={contentRef} w="100%" h="100%" mih={0}>
        <InnerContent
          item={item}
          width={width}
          height={height}
          widgetRuntimeRef={widgetRuntimeRef}
          displayMode={isAdvanced ? "advanced" : "compact"}
        />
      </Box>
    </Card>
  );

  return (
    <>
      <WidgetContextMenu item={item} widgetRuntimeRef={widgetRuntimeRef} sourceRef={sourceRef}>
        <Box
          ref={sourceRef}
          tabIndex={!isEditMode && supportsAdvancedFocus ? 0 : undefined}
          role={!isEditMode && supportsAdvancedFocus ? "group" : undefined}
          aria-label={
            !isEditMode && supportsAdvancedFocus ? `${widgetName}: ${t("item.advancedFocus.open")}` : undefined
          }
          aria-expanded={supportsAdvancedFocus ? isAdvanced : undefined}
          aria-controls={isAdvanced ? advancedViewId : undefined}
          aria-keyshortcuts={supportsAdvancedFocus ? "Shift+Enter" : undefined}
          onKeyDown={supportsAdvancedFocus ? handleKeyDown : undefined}
          onPointerEnter={() => {
            if (supportsAdvancedFocus && sourceRef.current) hover(item.id, sourceRef.current);
          }}
          onPointerLeave={() => {
            if (supportsAdvancedFocus) leave(item.id);
          }}
          className={combineClasses("grid-stack-item-content", isAdvanced && advancedFocusClasses.sourcePlaceholder)}
        >
          <div ref={(node) => mountPortalTarget(node, "compact")} className={advancedFocusClasses.surfaceHost}>
            {!supportsAdvancedFocus && widgetCard}
          </div>
          {surfacePortalTarget && createPortal(widgetCard, surfacePortalTarget)}
          {isPreview && (
            <Portal reuseTargetNode={false}>
              <div
                ref={(node) => mountPortalTarget(node, "preview")}
                className={advancedFocusClasses.surfaceHostAdvanced}
              />
            </Portal>
          )}
          {isManual && advancedRect && closePosition && (
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
              <div
                ref={(node) => mountPortalTarget(node, "manual")}
                className={advancedFocusClasses.manualSurfaceMount}
              />
            </AdvancedFocusManualSurface>
          )}
        </Box>
      </WidgetContextMenu>
      {!isAdvanced && item.advancedOptions.title?.trim() && (
        <Badge
          pos="absolute"
          style={{ zIndex: "var(--mantine-z-index-app)" }}
          top={2}
          left={16}
          size="xs"
          radius={board.itemRadius}
          styles={{
            root: {
              "--border-color": item.advancedOptions.borderColor !== "" ? item.advancedOptions.borderColor : undefined,
              "--opacity": board.opacity / 100,
            },
          }}
          className={itemContentClasses.badge}
          c="var(--mantine-color-text)"
        >
          {item.advancedOptions.title}
        </Badge>
      )}
    </>
  );
};

interface InnerContentProps {
  item: SectionItem;
  width: number;
  height: number;
  widgetRuntimeRef: WidgetRuntimeRef;
  displayMode: "compact" | "advanced";
}

const InnerContent = ({ item, ...dimensions }: InnerContentProps) => {
  const settings = useSettings();
  const board = useRequiredBoard();
  const [isEditMode] = useEditMode();
  const Comp = loadWidgetDynamic(item.kind);
  const { definition } = widgetImports[item.kind];
  const options = reduceWidgetOptionsWithDefaultValues(item.kind, settings, item.options);
  const newItem = { ...item, options };
  const { updateItemOptions } = useItemActions();
  const updateOptions = ({ newOptions }: { newOptions: Record<string, unknown> }) =>
    updateItemOptions({ itemId: item.id, newOptions });
  const widgetSupportsIntegrations =
    "supportedIntegrations" in definition && definition.supportedIntegrations.length >= 1;
  const queryClient = useQueryClient();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={() => {
            removePersistedWidgetQueries(queryClient);
            reset();
          }}
          fallbackRender={({ resetErrorBoundary, error }) => (
            <>
              <BoardItemMenu offset={4} item={newItem} resetErrorBoundary={resetErrorBoundary} />
              <WidgetError kind={item.kind} error={error} resetErrorBoundary={resetErrorBoundary} />
            </>
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
          <BoardItemMenu offset={4} item={newItem} />
          <Comp
            options={options as never}
            integrationIds={item.integrationIds}
            isEditMode={isEditMode}
            boardId={board.id}
            itemId={item.id}
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
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};
