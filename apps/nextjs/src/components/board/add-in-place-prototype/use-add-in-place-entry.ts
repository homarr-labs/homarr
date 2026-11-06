"use client";

import { useCallback } from "react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getRootSectionLane } from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { useIsMobile } from "@homarr/ui/hooks";
import type { WidgetEditModalState } from "@homarr/widgets/modals";

import { getFirstEmptyPosition } from "~/components/board/items/actions/empty-position";
import { getSectionElements } from "~/components/board/items/actions/section-elements";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { addInPlaceActions } from "./store";
import type { AreaRect } from "./types";

interface EditInPlaceInput {
  sectionId: string;
  area: AreaRect;
  itemId: string;
  kind: WidgetKind;
  value: WidgetEditModalState;
  appId?: string;
  onCommit: Parameters<typeof addInPlaceActions.startEdit>[0]["onCommit"];
}

const scrollAreaIntoView = () => {
  let attempts = 0;
  const tick = () => {
    const element = document.querySelector("[data-add-in-place-area]");
    if (element) {
      element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      return;
    }
    attempts += 1;
    if (attempts < 30) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

export const useAddInPlaceEntry = () => {
  const board = useRequiredBoard();
  const layoutId = useCurrentLayout();
  const [isEditMode, { open }] = useEditMode();
  const isMobile = useIsMobile();

  const addWidgetInPlace = useCallback(() => {
    const mainSection = board.sections
      .filter(
        (section): section is Extract<typeof section, { kind: "empty" }> =>
          section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
      )
      .toSorted((a, b) => a.yOffset - b.yOffset)
      .at(0);
    const layout = board.layouts.find((candidate) => candidate.id === layoutId) ?? board.layouts.at(0);
    if (!mainSection || !layout) return false;

    const columnCount = getBoardLaneColumnCount(layout, "main");
    const elements = getSectionElements(board, { sectionId: mainSection.id, layoutId: layout.id });
    const cell = getFirstEmptyPosition(elements, columnCount, undefined, { width: 1, height: 1 });
    if (!cell) return false;

    if (!isEditMode) open();
    addInPlaceActions.startCreate(mainSection.id, { x: cell.xOffset, y: cell.yOffset, w: 1, h: 1 });
    scrollAreaIntoView();
    return true;
  }, [board, isEditMode, layoutId, open]);

  const editInPlace = useCallback(
    (input: EditInPlaceInput) => {
      if (isMobile) return false;
      if (!isEditMode) open();
      addInPlaceActions.startEdit(input);
      scrollAreaIntoView();
      return true;
    },
    [isEditMode, isMobile, open],
  );

  return { addWidgetInPlace, editInPlace };
};
