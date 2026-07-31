"use client";

import type { FocusEvent, KeyboardEvent, PropsWithChildren } from "react";
import { useId, useState } from "react";
import { Box } from "@mantine/core";
import combineClasses from "clsx";

import { useCurrentLayout } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useI18n } from "@homarr/translation/client";

import type { DynamicSectionItem, SectionItem } from "~/app/[locale]/boards/_types";
import {
  getEditableGridCellAttributes,
  getLayoutRowCount,
  getLogicalItemStyle,
  getReadonlyGridItemAttributes,
  placeGridItem,
} from "~/components/board/layout";
import type { GridPlacement } from "~/components/board/layout";
import { useSectionContext } from "../section-context";
import classes from "./section-grid.module.css";
import type { SectionGridPlacement } from "./use-grid-layout-actions";
import { useGridLayoutActions } from "./use-grid-layout-actions";

interface FixedGridItemProps {
  item: DynamicSectionItem | SectionItem;
  minWidth?: number;
  minHeight?: number;
}

export const FixedGridItem = ({
  item,
  minWidth = 1,
  minHeight = 1,
  children,
}: PropsWithChildren<FixedGridItemProps>) => {
  const [isEditMode] = useEditMode();
  const currentLayoutId = useCurrentLayout();
  const t = useI18n();
  const { section, items, innerSections, columnCount, maxRowCount, announce } = useSectionContext();
  const { commitSectionGrid } = useGridLayoutActions();
  const [isKeyboardEditing, setIsKeyboardEditing] = useState(false);
  const instructionsId = useId();
  const placement = toPlacement(item);
  const displayName =
    item.type === "item"
      ? item.advancedOptions.title?.trim() || t(`widget.${item.kind}.name`)
      : item.options.title.trim() || t("section.dynamic.untitled");
  const accessibleLabel = t("item.moveResize.entryLabel", {
    name: displayName,
    column: String(placement.x + 1),
    row: String(placement.y + 1),
  });

  const setKeyboardEditing = (next: boolean) => {
    setIsKeyboardEditing(next);
    announce(
      `${accessibleLabel}: ${t(next ? "item.moveResize.keyboard.started" : "item.moveResize.keyboard.stopped")}`,
    );
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !isEditMode || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setKeyboardEditing(!isKeyboardEditing);
      return;
    }
    if (event.key === "Escape" && isKeyboardEditing) {
      event.preventDefault();
      setKeyboardEditing(false);
      return;
    }
    if (!isKeyboardEditing || !isArrowKey(event.key)) return;

    event.preventDefault();
    const allPlacements = [...items, ...innerSections].map(toPlacement);
    const current = allPlacements.find((candidate) => candidate.id === item.id);
    if (!current) return;

    const next = getKeyboardPlacement(current, event.key, event.shiftKey, {
      columnCount,
      minWidth,
      minHeight,
      maxRowCount,
    });
    if (next.x === current.x && next.y === current.y && next.w === current.w && next.h === current.h) {
      announce(`${accessibleLabel}: ${t("item.moveResize.keyboard.boundary")}`);
      return;
    }

    const resolved = placeGridItem(allPlacements, next, columnCount) as SectionGridPlacement[];
    if (maxRowCount !== null && getLayoutRowCount(resolved) > maxRowCount) {
      announce(`${accessibleLabel}: ${t("item.moveResize.keyboard.boundary")}`);
      return;
    }
    commitSectionGrid({ layoutId: currentLayoutId, sectionId: section.id, placements: resolved });
    announce(
      `${displayName}: ${t("item.moveResize.field.xOffset.label")} ${next.x + 1}, ${t(
        "item.moveResize.field.yOffset.label",
      )} ${next.y + 1}, ${t("item.moveResize.field.width.label")} ${next.w}, ${t(
        "item.moveResize.field.height.label",
      )} ${next.h}`,
    );
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isKeyboardEditing && !event.currentTarget.contains(event.relatedTarget)) {
      setIsKeyboardEditing(false);
    }
  };

  const semantics = isEditMode
    ? getEditableGridCellAttributes({ label: accessibleLabel, placement })
    : getReadonlyGridItemAttributes(placement);

  return (
    <Box
      {...semantics}
      className={combineClasses(isEditMode ? classes.editorEntry : classes.staticItem)}
      style={isEditMode ? { position: "relative", width: "100%", height: "100%" } : getLogicalItemStyle(placement)}
      data-grid-item-id={isEditMode ? undefined : item.id}
      data-grid-item-type={isEditMode ? undefined : item.type}
      data-editor-grid-entry={isEditMode ? "true" : undefined}
      data-type={item.type}
      data-kind={item.kind}
      data-keyboard-editing={isEditMode ? String(isKeyboardEditing) : undefined}
      aria-describedby={isEditMode ? instructionsId : undefined}
      aria-keyshortcuts={
        isEditMode
          ? "Enter Space Escape ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
          : undefined
      }
      onBlur={isEditMode ? handleBlur : undefined}
      onKeyDown={isEditMode ? handleKeyboard : undefined}
    >
      {children}
      {isEditMode && (
        <span id={instructionsId} className={classes.liveRegion}>
          {t("item.moveResize.keyboard.instructions")}
        </span>
      )}
    </Box>
  );
};

const toPlacement = (item: DynamicSectionItem | SectionItem): SectionGridPlacement => ({
  id: item.id,
  type: item.type,
  x: item.xOffset,
  y: item.yOffset,
  w: item.width,
  h: item.height,
});

const isArrowKey = (key: string): key is "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";

const getKeyboardPlacement = (
  current: SectionGridPlacement,
  key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown",
  resize: boolean,
  {
    columnCount,
    minWidth,
    minHeight,
    maxRowCount,
  }: {
    columnCount: number;
    minWidth: number;
    minHeight: number;
    maxRowCount: number | null;
  },
): GridPlacement & Pick<SectionGridPlacement, "type"> => {
  if (resize) {
    const widthDelta = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
    const heightDelta = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
    return {
      ...current,
      w: Math.max(minWidth, Math.min(columnCount - current.x, current.w + widthDelta)),
      h: Math.max(
        minHeight,
        Math.min(maxRowCount === null ? Number.MAX_SAFE_INTEGER : maxRowCount - current.y, current.h + heightDelta),
      ),
    };
  }

  const xDelta = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
  const yDelta = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
  return {
    ...current,
    x: Math.max(0, Math.min(columnCount - current.w, current.x + xDelta)),
    y: Math.max(
      0,
      Math.min(maxRowCount === null ? Number.MAX_SAFE_INTEGER : maxRowCount - current.h, current.y + yDelta),
    ),
  };
};
