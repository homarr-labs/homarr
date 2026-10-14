import type { FocusEvent, KeyboardEvent, PropsWithChildren } from "react";
import { useCallback, useId, useRef, useState } from "react";
import { ActionIcon, Box } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import combineClasses from "clsx";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { getEditableGridCellAttributes, getLogicalItemStyle, getReadonlyGridItemAttributes } from "./layout";
import type { GridPlacement } from "./layout";
import { useSectionContext, useBoardRuntime, useGridLayoutActions } from "./runtime";
import type { ContainerSectionItem, SectionItem, SectionGridPlacement } from "./runtime";
import { useBoardSelection } from "./selection";
import { beginGridTransaction, commitGridTransaction, previewGridMove, previewGridResize } from "./dnd";
import type { GridTransaction } from "./dnd";
import classes from "./section-grid.module.css";

interface FixedGridItemProps {
  item: ContainerSectionItem | SectionItem;
  minWidth?: number;
  minHeight?: number;
}
export const FixedGridItem = ({
  item,
  minWidth = 1,
  minHeight = 1,
  children,
}: PropsWithChildren<FixedGridItemProps>) => {
  const { editing, layout, onEditElement } = useBoardRuntime();
  const t = useI18n();
  const { section, columnCount, maxRowCount, placements, interactionDisabled, announce, entryElementStore } =
    useSectionContext();
  const { commitSectionGrid } = useGridLayoutActions();
  const [isKeyboardEditing, setIsKeyboardEditing] = useState(false);
  const { isSelected, toggleSelectItem } = useBoardSelection();
  const selected = item.type === "item" && isSelected(item.id);
  const registerElement = useCallback(
    (element: HTMLDivElement | null) => entryElementStore.register(item.id, element),
    [entryElementStore, item.id],
  );
  const isEditorActive = editing === true && !interactionDisabled;
  const handleClickCapture = (event: React.MouseEvent) => {
    if (!isEditorActive || item.type !== "item" || (!event.metaKey && !event.ctrlKey)) return;
    event.preventDefault();
    event.stopPropagation();
    toggleSelectItem(item.id);
  };
  const instructionsId = useId();
  const placement: SectionGridPlacement = {
    id: item.id,
    type: item.type,
    x: item.xOffset,
    y: item.yOffset,
    w: item.width,
    h: item.height,
  };
  const keyboardGridRef = useRef<{ source: readonly SectionGridPlacement[]; current: readonly SectionGridPlacement[] }>(
    { source: placements, current: placements },
  );
  const displayName =
    item.type === "item"
      ? item.advancedOptions.title?.trim() || getWidgetName(item.kind, t)
      : item.options.title.trim() || t("section.container.untitled");
  const accessibleLabel = t("item.moveResize.entryLabel", {
    name: displayName,
    column: String(placement.x + 1),
    row: String(placement.y + 1),
  });
  const semantics = isEditorActive
    ? getEditableGridCellAttributes({ label: accessibleLabel, placement })
    : getReadonlyGridItemAttributes(placement);
  const setKeyboardEditing = (next: boolean) => {
    setIsKeyboardEditing(next);
    announce(
      `${accessibleLabel}: ${t(next ? "item.moveResize.keyboard.started" : "item.moveResize.keyboard.stopped")}`,
    );
  };
  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !isEditorActive || event.altKey || event.ctrlKey || event.metaKey)
      return;
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
    if (document.body.hasAttribute("data-board-grid-interacting")) {
      setKeyboardEditing(false);
      return;
    }
    if (!arePlacementListsEqual(keyboardGridRef.current.source, placements))
      keyboardGridRef.current = { source: placements, current: placements };
    const currentPlacements = keyboardGridRef.current.current;
    const current = currentPlacements.find((candidate) => candidate.id === item.id);
    if (!current) return;
    let transaction: GridTransaction<SectionGridPlacement>;
    try {
      transaction = beginGridTransaction(
        { grids: [{ id: section.id, columnCount, maxRowCount, placements: currentPlacements }] },
        { activeId: current.id, sourceGridId: section.id },
      );
    } catch {
      keyboardGridRef.current = { source: currentPlacements, current: currentPlacements };
      setKeyboardEditing(false);
      return;
    }
    const delta = getKeyboardDelta(event.key);
    const result = event.shiftKey
      ? previewGridResize(transaction, {
          direction: "se",
          deltaColumns: delta.x,
          deltaRows: delta.y,
          minWidth,
          minHeight,
        })
      : previewGridMove(transaction, { targetGridId: section.id, x: current.x + delta.x, y: current.y + delta.y });
    const next = result.transaction.preview.grids[0]?.placements.find((candidate) => candidate.id === item.id);
    if (!result.accepted || !next || arePlacementsEqual(current, next)) {
      announce(`${accessibleLabel}: ${t("item.moveResize.keyboard.boundary")}`);
      return;
    }
    const committed = commitGridTransaction(result.transaction).grids[0];
    if (!committed) return;
    keyboardGridRef.current = { ...keyboardGridRef.current, current: committed.placements };
    commitSectionGrid({ layoutId: layout.id, sectionId: section.id, placements: committed.placements });
    announce(
      `${displayName}: ${t("item.moveResize.field.xOffset.label")} ${next.x + 1}, ${t("item.moveResize.field.yOffset.label")} ${next.y + 1}, ${t("item.moveResize.field.width.label")} ${next.w}, ${t("item.moveResize.field.height.label")} ${next.h}`,
    );
  };
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isKeyboardEditing && event.target === event.currentTarget) setKeyboardEditing(false);
  };
  return (
    <Box
      ref={registerElement}
      {...semantics}
      onClickCapture={handleClickCapture}
      data-board-item-selected={selected ? "true" : undefined}
      className={combineClasses(
        classes.staticItem,
        isEditorActive && "board-grid-entry",
        isEditorActive && classes.editorEntry,
      )}
      style={getLogicalItemStyle(placement, "var(--board-grid-row-scale, 1)")}
      data-grid-item-id={item.id}
      data-grid-item-type={item.type}
      data-grid-x={placement.x}
      data-grid-y={placement.y}
      data-grid-w={placement.w}
      data-grid-h={placement.h}
      data-grid-inline-start={placement.x === 0 || undefined}
      data-grid-inline-end={placement.x + placement.w === columnCount || undefined}
      data-editor-grid-entry={isEditorActive ? "true" : undefined}
      data-type={item.type}
      data-kind={item.kind}
      data-keyboard-editing={isEditorActive ? String(isKeyboardEditing) : undefined}
      aria-describedby={isEditorActive ? instructionsId : undefined}
      aria-selected={isEditorActive && item.type === "item" ? selected : undefined}
      aria-keyshortcuts={
        isEditorActive
          ? "Enter Space Escape ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
          : undefined
      }
      onBlur={isEditorActive ? handleBlur : undefined}
      onKeyDown={isEditorActive ? handleKeyboard : undefined}
    >
      <div className={combineClasses("board-grid-content-mount", classes.contentMount)}>{children}</div>
      {isEditorActive && item.type === "item" && onEditElement && (
        <ActionIcon
          data-grid-no-drag
          pos="absolute"
          top={4}
          right={4}
          variant="default"
          aria-label={`Edit ${displayName}`}
          onClick={() => onEditElement(placement, section.id)}
        >
          <IconDots size={16} />
        </ActionIcon>
      )}
      {isEditorActive && (
        <span id={instructionsId} className={classes.liveRegion}>
          {t("item.moveResize.keyboard.instructions")}
        </span>
      )}
    </Box>
  );
};
const isArrowKey = (key: string): key is "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" =>
  key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
const getKeyboardDelta = (key: "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown") => ({
  x: key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0,
  y: key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0,
});
const arePlacementsEqual = (first: GridPlacement, second: GridPlacement) =>
  first.x === second.x && first.y === second.y && first.w === second.w && first.h === second.h;
const arePlacementListsEqual = (first: readonly GridPlacement[], second: readonly GridPlacement[]) =>
  first.length === second.length &&
  first.every((placement, index) => {
    const candidate = second[index];
    return candidate?.id === placement.id && arePlacementsEqual(placement, candidate);
  });
