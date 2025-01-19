import type { Modify } from "@homarr/common/types";
import { createId } from "@homarr/db/client";
import type { WidgetKind } from "@homarr/definitions";

import type { Board, DynamicSection, EmptySection, Item } from "~/app/[locale]/boards/_types";
import { getFirstEmptyPosition } from "./empty-position";

export interface CreateItemInput {
  kind: WidgetKind;
}

export const createItemCallback =
  ({ kind }: CreateItemInput) =>
  (previous: Board): Board => {
    const firstSection = previous.sections
      .filter((section): section is EmptySection => section.kind === "empty")
      .sort((sectionA, sectionB) => sectionA.yOffset - sectionB.yOffset)
      .at(0);

    if (!firstSection) return previous;

    const dynamicSectionsOfFirstSection = previous.sections.filter(
      (section): section is DynamicSection => section.kind === "dynamic" && section.parentSectionId === firstSection.id,
    );
    const elements = [...firstSection.items, ...dynamicSectionsOfFirstSection];
    const emptyPosition = getFirstEmptyPosition(elements, previous.columnCount);

    if (!emptyPosition) {
      console.error("Your board is full");
      return previous;
    }

    const widget = {
      id: createId(),
      kind,
      options: {},
      width: 1,
      height: 1,
      ...emptyPosition,
      integrationIds: [],
      advancedOptions: {
        customCssClasses: [],
      },
    } satisfies Modify<
      Item,
      {
        kind: WidgetKind;
      }
    >;

    return {
      ...previous,
      sections: previous.sections.map((section) => {
        // Return same section if item is not in it
        if (section.id !== firstSection.id) return section;
        return {
          ...section,
          items: section.items.concat(widget),
        };
      }),
    };
  };
