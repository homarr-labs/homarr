import { getBoardLayouts } from "@homarr/boards/context";
import { createId } from "@homarr/common";
import type { Modify } from "@homarr/common/types";
import { getRootSectionLane } from "@homarr/definitions";
import type { WidgetKind } from "@homarr/definitions";
import { widgetDefaultSizes } from "@homarr/definitions";
import type { BoardItemAdvancedOptions } from "@homarr/validation/shared";

import type { Board, ContainerSection, EmptySection, Item, ItemLayout } from "~/app/[locale]/boards/_types";
import { getBoardLaneColumnCount } from "~/components/board/layout";
import { getFirstEmptyPosition } from "./empty-position";
import { getSectionElements } from "./section-elements";

export interface CreateItemInput {
  id?: string;
  kind: WidgetKind;
  options?: Record<string, unknown>;
  integrationIds?: string[];
  targetSectionId?: string;
  advancedOptions?: BoardItemAdvancedOptions;
}

export const createItemCallback =
  ({ id, kind, options = {}, integrationIds = [], targetSectionId, advancedOptions }: CreateItemInput) =>
  (previous: Board): Board => {
    const firstCanvasSection = previous.sections
      .filter(
        (section): section is EmptySection =>
          section.kind === "empty" && getRootSectionLane(section.xOffset) === "main",
      )
      .toSorted((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);
    const requestedSection = targetSectionId
      ? previous.sections.find(
          (section): section is EmptySection | ContainerSection =>
            section.id === targetSectionId && (section.kind === "empty" || section.kind === "container"),
        )
      : undefined;
    const targetSection = requestedSection ?? firstCanvasSection;

    if (!targetSection) return previous;

    const itemLayouts = createItemLayouts(previous, targetSection, kind);
    const widget = {
      id: id ?? createId(),
      kind,
      options,
      layouts: itemLayouts,
      integrationIds,
      advancedOptions: advancedOptions ?? { title: null, customCssClasses: [], borderColor: "" },
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
  currentSection: EmptySection | ContainerSection,
  kind: WidgetKind,
): ItemLayout[] => {
  const layouts = getBoardLayouts(board);
  const itemSize = getWidgetItemSize(kind);

  return layouts.map((layoutId) => {
    const boardLayout = board.layouts.find((layout) => layout.id === layoutId);
    const elements = getSectionElements(board, { sectionId: currentSection.id, layoutId });
    const containerLayout =
      currentSection.kind === "container"
        ? currentSection.layouts.find((layout) => layout.layoutId === layoutId)
        : undefined;
    const columnCount =
      containerLayout?.width ?? (boardLayout ? getBoardLaneColumnCount(boardLayout, "main") : itemSize.width);
    const size = {
      width: Math.min(itemSize.width, columnCount),
      height: itemSize.height,
    };

    const emptyPosition = boardLayout
      ? getFirstEmptyPosition(elements, columnCount, undefined, size)
      : { xOffset: 0, yOffset: 0 };

    if (!emptyPosition) {
      throw new Error("Your board is full");
    }

    return {
      width: size.width,
      height: size.height,
      ...emptyPosition,
      sectionId: currentSection.id,
      layoutId,
    };
  });
};
