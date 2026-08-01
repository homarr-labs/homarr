import type { CSSProperties, KeyboardEvent, MutableRefObject, PointerEvent } from "react";
import { useEffect, useRef } from "react";
import { ActionIcon, Badge, Box, Card, FocusTrap, Text } from "@mantine/core";
import { useElementSize, useMergedRef, useViewportSize } from "@mantine/hooks";
import { IconMaximize, IconPin, IconX } from "@tabler/icons-react";
import { QueryErrorResetBoundary, useQueryClient } from "@tanstack/react-query";
import combineClasses from "clsx";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";
import { ErrorBoundary } from "react-error-boundary";

import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { loadWidgetDynamic, reduceWidgetOptionsWithDefaultValues, widgetImports } from "@homarr/widgets";
import { WidgetError } from "@homarr/widgets/errors";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import advancedFocusClasses from "../advanced-focus/advanced-focus.module.css";
import { useAdvancedFocus } from "../advanced-focus/context";
import { getAdvancedFocusRect } from "../advanced-focus/geometry";
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
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const sourceRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRef(ref, sourceRef);
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const board = useRequiredBoard();
  const t = useI18n();
  const widgetName = t(`widget.${item.kind}.name`);
  const advancedDialogLabel = t("item.advancedFocus.dialog", { widget: widgetName });
  const [isEditMode] = useEditMode();
  const widgetStateRef = useRef<Record<string, unknown> | null>(null);
  const { active, open, close, dismiss, pin, hover, leave } = useAdvancedFocus();
  const activeFocus = active?.itemId === item.id ? active : null;
  const isAdvanced = activeFocus !== null;
  const advancedRect = activeFocus
    ? getAdvancedFocusRect(activeFocus.sourceRect, { width: viewportWidth, height: viewportHeight })
    : null;

  // Responsive layout changes remount grid items. Never leave their focus backdrop orphaned.
  useEffect(() => () => dismiss(item.id), [dismiss, item.id]);

  const openPinned = () => {
    if (sourceRef.current) open(item.id, sourceRef.current, true);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target || event.key !== "Enter" || !event.shiftKey || isEditMode) return;
    event.preventDefault();
    openPinned();
  };
  const handleSurfacePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!activeFocus || activeFocus.pinned) return;

    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex='-1']), [contenteditable='true']",
          )
        : null;
    const alreadyAutofocused = target?.hasAttribute("data-autofocus") ?? false;
    if (target && !alreadyAutofocused) target.setAttribute("data-autofocus", "true");
    pin(false);
    if (target && !alreadyAutofocused) {
      window.setTimeout(() => target.removeAttribute("data-autofocus"), 250);
    }
  };

  return (
    <>
      <WidgetContextMenu item={item} widgetStateRef={widgetStateRef} sourceRef={sourceRef}>
        <Box
          ref={mergedRef}
          tabIndex={isEditMode ? undefined : 0}
          role={isEditMode ? undefined : "group"}
          aria-label={isEditMode ? undefined : `${widgetName}: ${t("item.advancedFocus.open")}`}
          aria-haspopup="dialog"
          aria-expanded={isAdvanced}
          aria-keyshortcuts="Shift+Enter"
          onKeyDown={handleKeyDown}
          onPointerEnter={() => sourceRef.current && hover(item.id, sourceRef.current)}
          onPointerLeave={() => leave(item.id)}
          className={combineClasses("grid-stack-item-content", isAdvanced && advancedFocusClasses.sourcePlaceholder)}
        >
          <div
            className={combineClasses(
              advancedFocusClasses.surfaceHost,
              isAdvanced && advancedFocusClasses.surfaceHostAdvanced,
            )}
          >
            <FocusTrap active={Boolean(activeFocus?.pinned)}>
              <Card
                role={isAdvanced ? "dialog" : undefined}
                aria-modal={activeFocus?.pinned || undefined}
                aria-label={isAdvanced ? advancedDialogLabel : undefined}
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
                onPointerDownCapture={isAdvanced ? handleSurfacePointerDown : undefined}
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
                        "--focus-scale-x": activeFocus.sourceRect.width / advancedRect.width,
                        "--focus-scale-y": activeFocus.sourceRect.height / advancedRect.height,
                      } as CSSProperties)
                    : undefined
                }
              >
                <div
                  className={combineClasses(
                    advancedFocusClasses.surfaceControls,
                    isAdvanced && advancedFocusClasses.surfaceControlsAdvanced,
                  )}
                >
                  {isAdvanced && (
                    <Text className={advancedFocusClasses.surfaceTitle} size="sm" fw={600} truncate>
                      {advancedDialogLabel}
                    </Text>
                  )}
                  {isAdvanced && (
                    <ActionIcon
                      data-autofocus={activeFocus.pinned && activeFocus.autofocusClose ? true : undefined}
                      className={advancedFocusClasses.closeButton}
                      variant="default"
                      size={44}
                      aria-label={t("item.advancedFocus.close")}
                      onClick={() => close()}
                    >
                      <IconX size={18} />
                    </ActionIcon>
                  )}
                  {isAdvanced && (
                    <ActionIcon
                      className={advancedFocusClasses.pinButton}
                      variant={activeFocus.pinned ? "filled" : "default"}
                      size={44}
                      aria-label={activeFocus.pinned ? t("item.advancedFocus.pinned") : t("item.advancedFocus.pin")}
                      aria-pressed={activeFocus.pinned}
                      onClick={(event) => pin(event.detail === 0)}
                    >
                      <IconPin size={18} />
                    </ActionIcon>
                  )}
                  {!isEditMode && !isAdvanced && (
                    <ActionIcon
                      className={advancedFocusClasses.touchButton}
                      variant="default"
                      size={44}
                      aria-label={t("item.advancedFocus.open")}
                      onClick={openPinned}
                    >
                      <IconMaximize size={18} />
                    </ActionIcon>
                  )}
                </div>
                <InnerContent
                  item={item}
                  width={advancedRect?.width ?? width}
                  height={advancedRect?.height ?? height}
                  widgetStateRef={widgetStateRef}
                  displayMode={isAdvanced ? "advanced" : "compact"}
                />
              </Card>
            </FocusTrap>
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
