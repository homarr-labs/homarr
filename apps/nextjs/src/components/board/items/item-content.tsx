import type { CSSProperties, KeyboardEvent, MutableRefObject } from "react";
import { useEffect, useRef } from "react";
import { ActionIcon, Badge, Box, Card } from "@mantine/core";
import { useElementSize, useViewportSize } from "@mantine/hooks";
import { IconMaximize, IconX } from "@tabler/icons-react";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import { ErrorBoundary } from "react-error-boundary";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { WidgetDefinition } from "@homarr/widgets";
import {
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
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { active, open, close, dismiss, hover, leave } = useAdvancedFocus();
  const supportsAdvancedFocus = definitionSupportsAdvancedFocus(
    widgetImports[item.kind].definition as WidgetDefinition,
  );
  const advancedViewId = `advanced-focus-${item.id}`;
  const activeFocus = supportsAdvancedFocus && active?.itemId === item.id ? active : null;
  const isAdvanced = activeFocus !== null;
  const advancedRect = activeFocus
    ? getAdvancedFocusRect(activeFocus.sourceRect, { width: viewportWidth, height: viewportHeight })
    : null;
  const closePosition = advancedRect ? getAdvancedFocusClosePosition(advancedRect, viewportWidth) : null;

  // Responsive layout changes remount grid items. Never leave their focus backdrop orphaned.
  useEffect(() => () => dismiss(item.id), [dismiss, item.id]);

  useEffect(() => {
    if (!activeFocus?.autofocusClose || activeFocus.phase !== "visible") return;
    const frame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [activeFocus?.autofocusClose, activeFocus?.phase]);

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
    const surface = surfaceRef.current;
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
  }, [isAdvanced]);

  return (
    <>
      <WidgetContextMenu item={item} widgetStateRef={widgetStateRef} sourceRef={sourceRef}>
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
          <div
            className={combineClasses(
              advancedFocusClasses.surfaceHost,
              isAdvanced && advancedFocusClasses.surfaceHostAdvanced,
            )}
          >
            {activeFocus?.activation === "manual" && closePosition && (
              <ActionIcon
                ref={closeButtonRef}
                className={advancedFocusClasses.closeButton}
                variant="default"
                size={44}
                aria-label={t("item.advancedFocus.close")}
                aria-controls={advancedViewId}
                style={closePosition}
                onClick={() => close()}
              >
                <IconX size={18} />
              </ActionIcon>
            )}
            <Card
              ref={surfaceRef}
              id={isAdvanced ? advancedViewId : undefined}
              role={isAdvanced ? "region" : undefined}
              aria-label={isAdvanced ? advancedViewLabel : undefined}
              data-advanced-focus-surface={isAdvanced || undefined}
              radius={board.itemRadius}
              p={isAdvanced ? undefined : 0}
              h={isAdvanced ? undefined : "100%"}
              w={isAdvanced ? undefined : "100%"}
              className={combineClasses(
                classes.itemCard,
                `${item.kind}-wrapper`,
                isAdvanced && advancedFocusClasses.surface,
                activeFocus?.phase === "closing" && advancedFocusClasses.surfaceClosing,
                item.advancedOptions.customCssClasses.join(" "),
              )}
              styles={{
                root: {
                  "--opacity": isAdvanced ? 0.98 : board.opacity / 100,
                  containerType: "size",
                  overflow: getOverflowFromKind(item.kind),
                  "--border-color":
                    item.advancedOptions.borderColor !== "" ? item.advancedOptions.borderColor : undefined,
                },
              }}
              style={
                activeFocus && advancedRect
                  ? ({
                      left: advancedRect.left,
                      top: advancedRect.top,
                      width: advancedRect.width,
                      height: advancedRect.height,
                      "--focus-translate-x": `${activeFocus.sourceRect.left - advancedRect.left}px`,
                      "--focus-translate-y": `${activeFocus.sourceRect.top - advancedRect.top}px`,
                      "--focus-scale-x": advancedRect.width > 0 ? activeFocus.sourceRect.width / advancedRect.width : 1,
                      "--focus-scale-y":
                        advancedRect.height > 0 ? activeFocus.sourceRect.height / advancedRect.height : 1,
                    } as CSSProperties)
                  : undefined
              }
            >
              <div className={advancedFocusClasses.surfaceControls}>
                {!isEditMode && supportsAdvancedFocus && !isAdvanced && (
                  <ActionIcon
                    className={advancedFocusClasses.touchButton}
                    variant="default"
                    size={44}
                    aria-label={t("item.advancedFocus.open")}
                    onClick={() => openAdvanced()}
                  >
                    <IconMaximize size={18} />
                  </ActionIcon>
                )}
              </div>
              <Box ref={contentRef} w="100%" h="100%" mih={0}>
                <InnerContent
                  item={item}
                  width={width}
                  height={height}
                  widgetStateRef={widgetStateRef}
                  displayMode={isAdvanced ? "advanced" : "compact"}
                />
              </Box>
            </Card>
          </div>
        </Box>
      </WidgetContextMenu>
      {!isAdvanced && item.advancedOptions.title?.trim() && (
        <Badge
          pos="absolute"
          // It's 4 because of the mantine-react-table that has z-index 3
          style={{ zIndex: 4 }}
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
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
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
