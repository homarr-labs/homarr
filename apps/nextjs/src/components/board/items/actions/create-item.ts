import { getBoardLayouts } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import type { Modify } from "@homarr/common/types";
import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { Board, EmptySection, Item, ItemLayout } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition, getNearestEmptyPosition } from "./empty-position";
import { getSectionElements } from "./section-elements";

export interface BoardPlacementHint {
  sectionId: string;
  layoutId: string;
  xOffset: number;
  yOffset: number;
}

export interface CreateItemInput {
  id?: string;
  kind: WidgetKind;
  options?: Record<string, unknown>;
  integrationIds?: string[];
  advancedOptions?: BoardItemAdvancedOptions;
  placement?: BoardPlacementHint;
}

export const createItemCallback =
  ({ id, kind, options = {}, integrationIds = [], advancedOptions, placement }: CreateItemInput) =>
  (previous: Board): Board => {
    const firstSection = previous.sections
      .filter((section): section is EmptySection => section.kind === "empty")
      .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);

    if (!firstSection && !placement) return previous;

    const defaultSectionId = firstSection?.id ?? placement?.sectionId;
    if (!defaultSectionId) return previous;

    const widget = {
      id: id ?? createId(),
      kind,
      options,
      layouts: createItemLayouts(previous, defaultSectionId, kind, placement),
      integrationIds,
      advancedOptions: advancedOptions ?? {
        title: null,
        customCssClasses: [],
        borderColor: "",
      },
    } satisfies Modify<
      Item,
      {
        kind: WidgetKind;
      }
    >;

    return {
      ...previous,
      items: previous.items.concat(widget),
    };
  };

const defaultItemSize = { width: 1, height: 1 };

const getWidgetItemSize = (kind: WidgetKind) => widgetDefaultSizes[kind] ?? defaultItemSize;

const createItemLayouts = (
  board: Board,
  defaultSectionId: string,
  kind: WidgetKind,
  placement?: BoardPlacementHint,
): ItemLayout[] => {
  const layouts = getBoardLayouts(board);
  const itemSize = getWidgetItemSize(kind);

  return layouts.map((layoutId) => {
    const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
    const targetSectionId = placement?.layoutId === layoutId ? placement.sectionId : defaultSectionId;
    const elements = getSectionElements(board, { sectionId: targetSectionId, layoutId });

    const targetSection = board.sections.find((section) => section.id === targetSectionId);
    const dynamicLayout =
      targetSection?.kind === "dynamic"
        ? targetSection.layouts.find((layout) => layout.layoutId === layoutId)
        : undefined;
    const columnCount = dynamicLayout?.width ?? boardLayout?.columnCount ?? 1;
    const rowCount = dynamicLayout?.height ?? 9999;
    const emptyPosition = boardLayout
      ? placement?.layoutId === layoutId
        ? getNearestEmptyPosition(elements, columnCount, rowCount, placement, itemSize)
        : getFirstEmptyPosition(elements, columnCount, rowCount, itemSize)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      width: itemSize.width,
      height: itemSize.height,
      ...emptyPosition,
      sectionId: targetSectionId,
      layoutId,
    };
  });
};
