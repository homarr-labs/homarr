import { createId } from "@homarr/common";
import type { ContainerSectionOptions, SmartContainerOptions } from "@homarr/validation/shared";
import { smartContainerOptionsSchema } from "@homarr/validation/smart-container";

import type { Board, Item } from "~/app/[locale]/boards/_types";
import { createItemCallback } from "../../items/actions/create-item";
import type { CreateItemInput } from "../../items/actions/create-item";

export const getContainerEditorSmartOptions = (
  options: ContainerSectionOptions,
  items: Item[],
  containerId: string,
  title: string,
): SmartContainerOptions => {
  if (options.smart?.states.length) return structuredClone(options.smart);
  return smartContainerOptionsSchema.parse({
    ...options.smart,
    states: [
      {
        id: createId(),
        title,
        priority: 50,
        itemIds: items
          .filter((item) => item.layouts.some((layout) => layout.sectionId === containerId))
          .map((item) => item.id),
      },
    ],
  });
};

/** Changes stay local until Apply; merge only edited records into the latest board draft. */
export const applyContainerEditorDraft = (
  board: Board,
  containerId: string,
  options: ContainerSectionOptions,
  newItems: Item[],
  editedItems: ReadonlyMap<string, Item>,
  deletedIds: ReadonlySet<string>,
): Board => {
  const container = board.sections.find((section) => section.id === containerId);
  if (container?.kind !== "container") return board;
  const existingIds = new Set(board.items.map((item) => item.id));
  const boardLayoutIds = new Set(board.layouts.map((layout) => layout.id));
  const containerLayoutIds = new Set(container.layouts.map((layout) => layout.layoutId));
  const addedItems = newItems.flatMap((item) => {
    if (existingIds.has(item.id) || deletedIds.has(item.id)) return [];
    const layouts = item.layouts.filter(
      (layout) => boardLayoutIds.has(layout.layoutId) && containerLayoutIds.has(layout.layoutId),
    );
    if (layouts.length === 0) return [];
    const edited = editedItems.get(item.id) ?? item;
    return [{ ...edited, layouts }];
  });
  return {
    ...board,
    sections: board.sections.map((section) => {
      if (section.id !== containerId || section.kind !== "container") return section;
      return { ...section, options };
    }),
    items: [
      ...board.items
        .filter((item) => !deletedIds.has(item.id))
        .map((item) => {
          const edited = editedItems.get(item.id);
          if (!edited) return item;
          return {
            ...item,
            options: edited.options,
            advancedOptions: edited.advancedOptions,
            integrationIds: edited.integrationIds,
          };
        }),
      ...addedItems,
    ],
  };
};

export const createContainerEditorItem = (board: Board, items: Item[], input: CreateItemInput, containerId: string) => {
  const id = input.id ?? createId();
  return createItemCallback({ ...input, id, targetSectionId: containerId })({ ...board, items }).items.find(
    (item) => item.id === id,
  );
};
