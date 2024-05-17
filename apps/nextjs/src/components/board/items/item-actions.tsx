import { useCallback } from "react";

import { createId } from "@homarr/db/client";
import type { WidgetKind } from "@homarr/definitions";
import type {
  BoardItemAdvancedOptions,
  BoardItemIntegration,
} from "@homarr/validation";

import type { EmptySection, Item } from "~/app/[locale]/boards/_types";
import { useUpdateBoard } from "~/app/[locale]/boards/(content)/_client";

interface MoveAndResizeItem {
  itemId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}
interface MoveItemToSection {
  itemId: string;
  sectionId: string;
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
}
interface RemoveItem {
  itemId: string;
}

interface UpdateItemOptions {
  itemId: string;
  newOptions: Record<string, unknown>;
}

interface UpdateItemAdvancedOptions {
  itemId: string;
  newAdvancedOptions: BoardItemAdvancedOptions;
}

interface UpdateItemIntegrations {
  itemId: string;
  newIntegrations: BoardItemIntegration[];
}

interface CreateItem {
  kind: WidgetKind;
}

export const useItemActions = () => {
  const { updateBoard } = useUpdateBoard();

  const createItem = useCallback(
    ({ kind }: CreateItem) => {
      updateBoard((previous) => {
        const lastSection = previous.sections
          .filter(
            (section): section is EmptySection => section.kind === "empty",
          )
          .sort(
            (sectionA, sectionB) => sectionB.position - sectionA.position,
          )[0];

        if (!lastSection) return previous;

        const widget = {
          id: createId(),
          kind,
          options: {},
          width: 1,
          height: 1,
          integrations: [],
          advancedOptions: {
            customCssClasses: [],
          },
        } satisfies Omit<Item, "kind" | "yOffset" | "xOffset"> & {
          kind: WidgetKind;
        };

        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return same section if item is not in it
            if (section.id !== lastSection.id) return section;
            return {
              ...section,
              items: section.items.concat(widget as unknown as Item),
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const updateItemOptions = useCallback(
    ({ itemId, newOptions }: UpdateItemOptions) => {
      updateBoard((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return same section if item is not in it
            if (!section.items.some((item) => item.id === itemId))
              return section;
            return {
              ...section,
              items: section.items.map((item) => {
                // Return same item if item is not the one we're changing
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  options: newOptions,
                };
              }),
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const updateItemAdvancedOptions = useCallback(
    ({ itemId, newAdvancedOptions }: UpdateItemAdvancedOptions) => {
      updateBoard((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return same section if item is not in it
            if (!section.items.some((item) => item.id === itemId))
              return section;
            return {
              ...section,
              items: section.items.map((item) => {
                // Return same item if item is not the one we're changing
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  advancedOptions: newAdvancedOptions,
                };
              }),
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const updateItemIntegrations = useCallback(
    ({ itemId, newIntegrations }: UpdateItemIntegrations) => {
      updateBoard((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return same section if item is not in it
            if (!section.items.some((item) => item.id === itemId))
              return section;
            return {
              ...section,
              items: section.items.map((item) => {
                // Return same item if item is not the one we're moving
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  ...("integrations" in item
                    ? { integrations: newIntegrations }
                    : {}),
                };
              }),
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const moveAndResizeItem = useCallback(
    ({ itemId, ...positionProps }: MoveAndResizeItem) => {
      updateBoard((previous) => ({
        ...previous,
        sections: previous.sections.map((section) => {
          // Return same section if item is not in it
          if (!section.items.some((item) => item.id === itemId)) return section;
          return {
            ...section,
            items: section.items.map((item) => {
              // Return same item if item is not the one we're moving
              if (item.id !== itemId) return item;
              return {
                ...item,
                ...positionProps,
              } satisfies Item;
            }),
          };
        }),
      }));
    },
    [updateBoard],
  );

  const moveItemToSection = useCallback(
    ({ itemId, sectionId, ...positionProps }: MoveItemToSection) => {
      updateBoard((previous) => {
        const currentSection = previous.sections.find((section) =>
          section.items.some((item) => item.id === itemId),
        );

        // If item is in the same section (on initial loading) don't do anything
        if (!currentSection) {
          return previous;
        }

        const currentItem = currentSection.items.find(
          (item) => item.id === itemId,
        );
        if (!currentItem) {
          return previous;
        }

        if (currentSection.id === sectionId && currentItem.xOffset) {
          return previous;
        }

        return {
          ...previous,
          sections: previous.sections.map((section) => {
            // Return sections without item if not section where it is moved to
            if (section.id !== sectionId)
              return {
                ...section,
                items: section.items.filter((item) => item.id !== itemId),
              };

            // Return section and add item to it
            return {
              ...section,
              items: section.items
                .filter((item) => item.id !== itemId)
                .concat({
                  ...currentItem,
                  ...positionProps,
                }),
            };
          }),
        };
      });
    },
    [updateBoard],
  );

  const removeItem = useCallback(
    ({ itemId }: RemoveItem) => {
      updateBoard((previous) => {
        return {
          ...previous,
          // Filter removed item out of items array
          sections: previous.sections.map((section) => ({
            ...section,
            items: section.items.filter((item) => item.id !== itemId),
          })),
        };
      });
    },
    [updateBoard],
  );

  return {
    moveAndResizeItem,
    moveItemToSection,
    removeItem,
    updateItemOptions,
    updateItemAdvancedOptions,
    updateItemIntegrations,
    createItem,
  };
};
