"use client";

import { useEffect, useRef, useState } from "react";
import { Text } from "@mantine/core";
import { IconPlugConnectedX } from "@tabler/icons-react";

import { useOptionalBoard } from "@homarr/boards/context";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { getWidgetIntegrationsRequired, WidgetLivePreview } from "@homarr/widgets/modals";

import { PreviewRuntimeWrapper } from "~/components/board/items/lazy-widget-edit-modal";
import { getLogicalItemStyle } from "~/components/board/layout";
import classes from "./area-overlay.module.css";
import type { SectionOccupancy } from "./occupancy";
import { useTargetResources } from "./resources";
import { addInPlaceActions, getAddInPlaceState, useAddInPlaceState } from "./store";
import { projectGridCoordinates } from "../sections/grid/grid-row-projection";
import type { GridRowProjection } from "../sections/grid/grid-row-projection";

const rowScale = "var(--board-grid-row-scale, 1)";
const highlightDelay = 120;

const useDebounced = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(handle);
  }, [delay, value]);
  return debounced;
};

interface AreaOverlayProps {
  occupancy: SectionOccupancy;
  entryElements: ReadonlyMap<string, HTMLElement>;
  rowProjection?: GridRowProjection;
}

export const AreaOverlay = ({ occupancy, entryElements, rowProjection }: AreaOverlayProps) => {
  const { step, session } = useAddInPlaceState();
  const t = useI18n();
  const board = useOptionalBoard();
  const layerRef = useRef<HTMLDivElement>(null);
  const resizeControllerRef = useRef<AbortController | null>(null);
  const active = session?.sectionId === occupancy.sectionId;
  const editItemId = active ? session.editItemId : undefined;

  const wanted = step === "pick" ? session?.highlighted : session?.picked;
  const debouncedTarget = useDebounced(wanted, step === "pick" ? highlightDelay : 0);
  const shownTarget = step === "createApp" ? undefined : debouncedTarget;
  const resources = useTargetResources(active ? shownTarget : undefined);

  useEffect(() => {
    if (!editItemId) return;
    const element = entryElements.get(editItemId);
    if (!element) return;
    const previous = element.style.visibility;
    element.style.visibility = "hidden";
    return () => {
      element.style.visibility = previous;
    };
  }, [editItemId, entryElements]);

  useEffect(
    () => () => {
      resizeControllerRef.current?.abort();
      resizeControllerRef.current = null;
    },
    [active, editItemId, occupancy.sectionId],
  );

  if (!active || !session) return null;

  const draft = step === "pick" ? undefined : session.draft;
  const value = draft ?? resources.baseValue;
  const requiresIntegration =
    resources.definition !== null && getWidgetIntegrationsRequired(resources.definition, resources.integrationSupport);
  const needsSetup = requiresIntegration && (value?.integrationIds.length ?? 0) === 0;
  const { definition, Component, kind } = resources;
  const renderable =
    resources.status === "ready" && definition && Component && kind && value && !needsSetup
      ? { definition, Component, kind, value }
      : null;

  const handleResizePointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const grid = layerRef.current?.parentElement;
    if (!grid) return;
    const bounds = grid.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    resizeControllerRef.current?.abort();
    const controller = new AbortController();
    resizeControllerRef.current = controller;
    const pointerId = event.pointerId;
    const effectiveRowScale = Number.parseFloat(getComputedStyle(grid).getPropertyValue("--board-grid-row-scale")) || 1;
    const rowPitch = (bounds.width / occupancy.columnCount) * effectiveRowScale;
    let expectedSession = session;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (getAddInPlaceState().session !== expectedSession) {
        controller.abort();
        return;
      }
      const rect = grid.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = Math.floor(((moveEvent.clientX - rect.left) / rect.width) * occupancy.columnCount);
      const displayRow = (moveEvent.clientY - rect.top) / rowPitch;
      const y = Math.floor(rowProjection?.getLogicalRow(displayRow) ?? displayRow);
      const current = session.area;
      addInPlaceActions.resizeTo(Math.max(1, x - current.x + 1), Math.max(1, y - current.y + 1));
      const nextSession = getAddInPlaceState().session;
      if (nextSession) expectedSession = nextSession;
    };
    const stop = (stopEvent: PointerEvent) => {
      if (stopEvent.pointerId !== pointerId) return;
      controller.abort();
    };
    window.addEventListener("pointermove", move, { signal: controller.signal });
    window.addEventListener("pointerup", stop, { signal: controller.signal });
    window.addEventListener("pointercancel", stop, { signal: controller.signal });
    window.addEventListener("blur", () => controller.abort(), { signal: controller.signal });
  };

  const label = resources.kind ? getWidgetName(resources.kind, t) : "";

  return (
    <div ref={layerRef} className={classes.layer}>
      <div
        className={classes.area}
        style={getLogicalItemStyle(projectGridCoordinates(session.area, rowProjection), rowScale)}
        data-add-in-place-area=""
        data-area-step={step}
      >
        <div className={classes.frame}>
          {renderable && (
            <div className={classes.preview}>
              <WidgetLivePreview
                kind={renderable.kind}
                Component={renderable.Component}
                definition={renderable.definition}
                options={renderable.value.options}
                integrationIds={renderable.value.integrationIds}
                advancedOptions={renderable.value.advancedOptions}
                integrationData={resources.integrationData}
                fallbackWidth={session.area.w * 212}
                fallbackHeight={session.area.h * 212}
                displayScale={1}
                boardId={board?.id}
                itemId={editItemId}
                isEditMode={false}
                onChangeOptions={() => undefined}
                PreviewWrapper={PreviewRuntimeWrapper}
                shellClassName={classes.shell}
              />
            </div>
          )}
          {needsSetup && resources.status === "ready" && (
            <div className={classes.ghost}>
              <IconPlugConnectedX size={28} stroke={1.5} />
              <Text size="sm" fw={600} ta="center">
                {label}
              </Text>
              <Text size="xs" c="dimmed" ta="center">
                {t("item.create.connectionStatus.needsSetup")}
              </Text>
            </div>
          )}
          {!renderable && !needsSetup && shownTarget && resources.status !== "ready" && (
            <div className={classes.ghost}>
              <Text size="xs" c="dimmed">
                {t(`item.inPlace.preview.${resources.status === "error" ? "error" : "loading"}`)}
              </Text>
            </div>
          )}
        </div>
        <span className={classes.outline} />
        <span className={classes.handle} onPointerDown={handleResizePointerDown} data-add-in-place-handle="" />
      </div>
    </div>
  );
};
