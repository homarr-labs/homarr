import { useCallback } from "react";

import { createId } from "@homarr/db/client";
import type { WidgetKind } from "@homarr/definitions";

import { useUpdateBoard } from "~/app/[locale]/boards/_client";
import type { EmptySection, Item } from "~/app/[locale]/boards/_types";

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

interface CreateItem {
  kind: WidgetKind;
}

export const useItemActions = () => {
  const { updateBoard } = useUpdateBoard();

  const createItem = useCallback(
    ({ kind }: CreateItem) => {
      updateBoard((prev) => {
        const lastSection = prev.sections
          .filter((s): s is EmptySection => s.kind === "empty")
          .sort((a, b) => b.position - a.position)[0];

        if (!lastSection) return prev;

        const widget = {
          id: createId(),
          kind,
          options: {},
          width: 1,
          height: 1,
          integrations: [],
        } satisfies Omit<Item, "kind" | "yOffset" | "xOffset"> & {
          kind: WidgetKind;
        };

        return {
          ...prev,
          sections: prev.sections.map((section) => {
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
      updateBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: prev.sections.map((section) => {
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

  const moveAndResizeItem = useCallback(
    ({ itemId, ...positionProps }: MoveAndResizeItem) => {
      updateBoard((prev) => ({
        ...prev,
        sections: prev.sections.map((section) => {
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
      updateBoard((prev) => {
        const currentSection = prev.sections.find((section) =>
          section.items.some((item) => item.id === itemId),
        );

        // If item is in the same section (on initial loading) don't do anything
        if (!currentSection) {
          return prev;
        }

        const currentItem = currentSection.items.find(
          (item) => item.id === itemId,
        );
        if (!currentItem) {
          return prev;
        }

        if (currentSection.id === sectionId && currentItem.xOffset) {
          return prev;
        }

        return {
          ...prev,
          sections: prev.sections.map((section) => {
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
      updateBoard((prev) => {
        return {
          ...prev,
          // Filter removed item out of items array
          sections: prev.sections.map((section) => ({
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
    createItem,
  };
};
