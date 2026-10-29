"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, Button, Group, Text, UnstyledButton } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { iconSizes, zoomCompensatedSize } from "@homarr/ui";
import type { SmartContainerOptions } from "@homarr/validation/smart-container";

import type { ContainerSectionItem } from "~/app/[locale]/boards/_types";
import { useSectionItems } from "../use-section-items";
import { LazyContainerEditModal } from "../container/lazy-container-edit-modal";
import { projectSmartContainerState } from "./smart-container-layout";
import {
  SmartContainerProjectionProvider,
  useSmartContainerLayout,
  useSmartContainerPreviewState,
  useSmartContainerProjection,
} from "./smart-container-context";
import { useSmartContainerRuntime } from "./use-smart-container-runtime";
import classes from "./smart-container-surface.module.css";

const useOpenContainerEditor = (section: ContainerSectionItem) => {
  const { openModal } = useModalAction(LazyContainerEditModal);
  return () => openModal({ containerId: section.id, value: section.options });
};

interface SurfaceProps extends PropsWithChildren {
  section: ContainerSectionItem;
  collapsed: boolean;
}

export const SmartContainerSurface = ({ section, children, collapsed }: SurfaceProps) => {
  const smart = section.options.smart;
  if (!smart?.enabled || smart.states.length === 0) return children;
  return (
    <ReelSurface section={section} options={smart} collapsed={collapsed}>
      {children}
    </ReelSurface>
  );
};

const ReelSurface = ({ section, options, children, collapsed }: SurfaceProps & { options: SmartContainerOptions }) => {
  const board = useRequiredBoard();
  const layoutId = useCurrentLayout();
  const [isEditMode] = useEditMode();
  const preview = useSmartContainerPreviewState();
  const previewStateId = preview?.stateId;
  const { items } = useSectionItems(section.id);
  const layoutRegistry = useSmartContainerLayout();
  const runtime = useSmartContainerRuntime({ options, items, isEditMode, isCollapsed: collapsed, previewStateId });
  const { selectedState, selectedStateId, states } = runtime;
  const original = board.sections.find((entry) => entry.id === section.id);
  let savedRows = section.height;
  if (original?.kind === "container")
    savedRows = original.layouts.find((layout) => layout.layoutId === layoutId)?.height ?? savedRows;
  const liveProjection = useMemo(
    () =>
      projectSmartContainerState({
        state: selectedState ?? { id: "", title: "", priority: 0, itemIds: [] },
        items,
        columnCount: section.width,
        rowBudget: savedRows,
        reclaimSpace: options.reclaimSpace,
        activities: runtime.activities,
        now: runtime.now,
      }),
    [selectedState, items, section.width, savedRows, options.reclaimSpace, runtime.activities, runtime.now],
  );
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [focusedProjection, setFocusedProjection] = useState<typeof liveProjection | null>(null);
  const projection = focusedProjection ?? liveProjection;
  const selectedIndex = states.findIndex((state) => state.id === selectedStateId);
  const showPeeks = states.length > 1 && section.height >= 3;
  const previous = states[(selectedIndex - 1 + states.length) % states.length];
  const next = states[(selectedIndex + 1) % states.length];
  const openEditor = useOpenContainerEditor(section);
  const t = useI18n("section.container.smart");
  const surfaceRef = useRef<HTMLElement>(null);
  const priorStateId = useRef(selectedStateId);
  const setRows = layoutRegistry?.setRows;
  const displayRows = Math.max(Math.min(3, savedRows), Math.min(savedRows, projection.rowCount));

  useEffect(() => {
    if (!setRows) return;
    let rows: number | null = null;
    if (options.reclaimSpace && !isEditMode && !previewStateId) rows = displayRows;
    setRows(section.id, rows);
    return () => setRows(section.id, null);
  }, [setRows, section.id, displayRows, options.reclaimSpace, isEditMode, previewStateId]);

  useEffect(() => {
    if (priorStateId.current === selectedStateId) return;
    const direction = states.findIndex((state) => state.id === priorStateId.current) < selectedIndex ? 1 : -1;
    priorStateId.current = selectedStateId;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const body = surfaceRef.current?.querySelector("[data-board-container-body]");
    const animation = body?.animate(
      [
        { opacity: 0, transform: `translateY(${direction * 14}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 240, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [selectedStateId, selectedIndex, states]);

  const previousState = () => {
    if (preview?.onSelectState && previous) preview.onSelectState(previous.id);
    else runtime.previousState();
  };
  const nextState = () => {
    if (preview?.onSelectState && next) preview.onSelectState(next.id);
    else runtime.nextState();
  };
  const value = {
    sectionId: section.id,
    projection,
    now: runtime.now,
    focusedItemId,
    runtime: { ...runtime, previousState, nextState },
  };
  if (collapsed) return <SmartContainerProjectionProvider value={value}>{children}</SmartContainerProjectionProvider>;

  return (
    <SmartContainerProjectionProvider value={value}>
      <Box
        component="section"
        ref={surfaceRef}
        className={classes.reel}
        aria-roledescription="carousel"
        aria-label={section.options.title || t("state")}
        data-smart-container={section.id}
        data-selected-state={selectedStateId}
        data-multiple-states={showPeeks || undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") runtime.setHovered(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") runtime.setHovered(false);
        }}
        onFocusCapture={(event) => {
          if (!(event.target instanceof Element) || !event.target.closest('[data-grid-item-type="item"]')) return;
          setFocusedItemId(
            event.target.closest<HTMLElement>('[data-grid-item-type="item"]')?.dataset.gridItemId ?? null,
          );
          runtime.holdForFocus();
          setFocusedProjection((current) => current ?? liveProjection);
        }}
        onBlurCapture={(event) => {
          const nextTarget = event.relatedTarget;
          if (
            nextTarget instanceof Element &&
            nextTarget.closest('[data-grid-item-type="item"]') &&
            event.currentTarget.contains(nextTarget)
          )
            return;
          if (nextTarget instanceof Element && focusedItemId) {
            const widget = event.currentTarget.querySelector(`[data-grid-item-id="${CSS.escape(focusedItemId)}"]`);
            const controls = widget?.querySelectorAll("[aria-controls]") ?? [];
            for (const control of controls) {
              const controlledIds = control.getAttribute("aria-controls")?.split(/\s+/) ?? [];
              if (controlledIds.some((id) => document.getElementById(id)?.contains(nextTarget))) return;
            }
          }
          setFocusedProjection(null);
          setFocusedItemId(null);
        }}
      >
        {showPeeks && previous && (
          <UnstyledButton
            type="button"
            className={classes.peek}
            data-direction="previous"
            aria-label={t("previousState") + ": " + previous.title}
            onClick={previousState}
          >
            <IconChevronUp />
            <span className={classes.peekTitle}>{previous.title || t("state")}</span>
          </UnstyledButton>
        )}
        <div className={classes.content}>
          {children}
          {projection.itemIds.length === 0 && (
            <div className={classes.empty}>
              <Text size="sm" c="dimmed">
                {t("empty")}
              </Text>
              {isEditMode && (
                <Button variant="light" onClick={openEditor}>
                  {t("addWidget")}
                </Button>
              )}
            </div>
          )}
        </div>
        {showPeeks && next && (
          <UnstyledButton
            type="button"
            className={classes.peek}
            data-direction="next"
            aria-label={t("nextState") + ": " + next.title}
            onClick={nextState}
          >
            <IconChevronDown />
            <span className={classes.peekTitle}>{next.title || t("state")}</span>
          </UnstyledButton>
        )}
        <span
          className={classes.liveRegion}
          aria-live={runtime.isPaused || options.mode === "smart" || options.mode === "manual" ? "polite" : "off"}
          aria-atomic="true"
        >
          {selectedState?.title} · {t("position", { current: selectedIndex + 1, total: states.length })}
        </span>
      </Box>
    </SmartContainerProjectionProvider>
  );
};

export const SmartContainerToolbar = ({ section }: { section: ContainerSectionItem }) => {
  const context = useSmartContainerProjection();
  const preview = useSmartContainerPreviewState();
  const [isEditMode] = useEditMode();
  const openEditor = useOpenContainerEditor(section);
  const t = useI18n("section.container.smart");
  if (!context || context.sectionId !== section.id) return null;
  const { runtime } = context;
  const selectedIndex = runtime.states.findIndex((state) => state.id === runtime.selectedStateId);
  let pauseLabel = t("pause");
  let pauseIcon = <IconPlayerPause style={iconSizes.sm} />;
  if (runtime.pauseReason === "manual" || runtime.pauseReason === "focus" || runtime.pauseReason === "paused") {
    pauseLabel = t("resume");
    pauseIcon = <IconPlayerPlay style={iconSizes.sm} />;
  }
  const isTimer =
    runtime.canRotate && (section.options.smart?.mode === "hybrid" || section.options.smart?.mode === "timed");
  return (
    <Group className={classes.toolbar} gap={3} wrap="nowrap" data-grid-no-drag data-editing={isEditMode || undefined}>
      <Group className={classes.navigation} gap={2} wrap="nowrap">
        <ActionIcon
          variant="default"
          style={zoomCompensatedSize(44)}
          aria-label={t("previousState")}
          onClick={runtime.previousState}
          disabled={runtime.states.length < 2}
        >
          <IconChevronLeft style={iconSizes.md} />
        </ActionIcon>
        <div className={classes.stateTitle}>
          <Text size="xs" fw={600}>
            {runtime.selectedState?.title || t("state")}
          </Text>
          <Text size="xs" c="dimmed" className={classes.position}>
            {t("position", { current: selectedIndex + 1, total: runtime.states.length })}
          </Text>
        </div>
        <ActionIcon
          variant="default"
          style={zoomCompensatedSize(44)}
          aria-label={t("nextState")}
          onClick={runtime.nextState}
          disabled={runtime.states.length < 2}
        >
          <IconChevronRight style={iconSizes.md} />
        </ActionIcon>
      </Group>
      {isTimer && !runtime.isPaused && (
        <Text size="xs" c="dimmed">
          {runtime.remainingSeconds}s
        </Text>
      )}
      {!isEditMode && !preview && section.options.smart?.mode !== "manual" && (
        <ActionIcon
          variant="subtle"
          style={zoomCompensatedSize(44)}
          aria-label={pauseLabel}
          title={pauseLabel}
          onClick={() => {
            if (runtime.pauseReason === "manual" || runtime.pauseReason === "focus" || runtime.pauseReason === "paused")
              runtime.resume();
            else runtime.pause();
          }}
        >
          {pauseIcon}
        </ActionIcon>
      )}
      {isEditMode && (
        <ActionIcon variant="light" style={zoomCompensatedSize(44)} aria-label={t("edit")} onClick={openEditor}>
          <IconPencil style={iconSizes.sm} />
        </ActionIcon>
      )}
    </Group>
  );
};
