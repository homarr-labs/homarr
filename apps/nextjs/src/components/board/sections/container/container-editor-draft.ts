import { createId } from "@homarr/common";
import type { ContainerSectionOptions, SmartContainerOptions } from "@homarr/validation/shared";
import {
  getSmartContainerMemberIds,
  resolveSmartContainerMembership,
  smartContainerOptionsSchema,
  smartContainerStateItemLimit,
  smartContainerStateLimit,
} from "@homarr/validation/smart-container";

import type { Board, Item } from "~/app/[locale]/boards/_types";
import { createItemCallback } from "../../items/actions/create-item";
import type { CreateItemInput } from "../../items/actions/create-item";

export const getContainerEditorSmartOptions = (
  options: ContainerSectionOptions,
  items: Item[],
  section: { id: string; kind: string; layouts?: readonly { layoutId: string }[] },
  stateLabel: string,
): SmartContainerOptions => {
  const memberIds = getSmartContainerMemberIds(section, items);
  if (options.smart?.states.length) {
    return {
      ...structuredClone(options.smart),
      states: resolveSmartContainerMembership(options.smart.states, memberIds),
    };
  }
  const itemIds = [...memberIds];
  const stateCount = Math.min(
    smartContainerStateLimit,
    Math.max(1, Math.ceil(itemIds.length / smartContainerStateItemLimit)),
  );
  return smartContainerOptionsSchema.parse({
    ...options.smart,
    states: Array.from({ length: stateCount }, (_, index) => ({
      id: createId(),
      title: `${stateLabel} ${index + 1}`,
      itemIds: itemIds.slice(index * smartContainerStateItemLimit, (index + 1) * smartContainerStateItemLimit),
    })),
  });
};

/** Changes stay local until Apply; merge only edited records into the latest board draft. */
export const applyContainerEditorDraft = (
  board: Board,
  initialBoard: Board,
  containerId: string,
  initialOptions: ContainerSectionOptions,
  options: ContainerSectionOptions,
  newItems: Item[],
  editedItems: ReadonlyMap<string, Item>,
  deletedIds: ReadonlySet<string>,
): Board | null => {
  const container = board.sections.find((section) => section.id === containerId);
  if (container?.kind !== "container") return null;
  const equal = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
  const updatedOptions = { ...container.options };
  for (const key of Object.keys(options) as (keyof ContainerSectionOptions)[]) {
    if (equal(options[key], initialOptions[key])) continue;
    if (!equal(container.options[key], initialOptions[key])) return null;
    Object.assign(updatedOptions, { [key]: options[key] });
  }
  for (const id of new Set([...editedItems.keys(), ...deletedIds])) {
    if (newItems.some((item) => item.id === id)) continue;
    const before = initialBoard.items.find((item) => item.id === id);
    const current = board.items.find((item) => item.id === id);
    if (!before || !current || !equal(before.layouts, current.layouts)) return null;
    if (deletedIds.has(id) && !equal(before, current)) return null;
    if (
      editedItems.has(id) &&
      (!equal(before.options, current.options) ||
        !equal(before.advancedOptions, current.advancedOptions) ||
        !equal(before.integrationIds, current.integrationIds))
    )
      return null;
  }
  const existingIds = new Set(board.items.map((item) => item.id));
  const boardLayoutIds = new Set(board.layouts.map((layout) => layout.id));
  const addedItems: Item[] = [];
  for (const item of newItems) {
    if (deletedIds.has(item.id)) continue;
    if (existingIds.has(item.id)) return null;
    for (const layout of item.layouts) {
      const parent = container.layouts.find((entry) => entry.layoutId === layout.layoutId);
      if (
        !parent ||
        !boardLayoutIds.has(layout.layoutId) ||
        layout.sectionId !== containerId ||
        layout.xOffset + layout.width > parent.width
      )
        return null;
      const overlaps = (other: { xOffset: number; yOffset: number; width: number; height: number }) =>
        layout.xOffset < other.xOffset + other.width &&
        layout.xOffset + layout.width > other.xOffset &&
        layout.yOffset < other.yOffset + other.height &&
        layout.yOffset + layout.height > other.yOffset;
      if (
        board.items.some(
          (existing) =>
            !deletedIds.has(existing.id) &&
            existing.layouts.some(
              (entry) => entry.layoutId === layout.layoutId && entry.sectionId === containerId && overlaps(entry),
            ),
        )
      )
        return null;
      if (
        board.sections.some(
          (section) =>
            section.kind === "container" &&
            section.layouts.some(
              (entry) => entry.layoutId === layout.layoutId && entry.parentSectionId === containerId && overlaps(entry),
            ),
        )
      )
        return null;
    }
    if (item.layouts.length === 0) return null;
    addedItems.push(editedItems.get(item.id) ?? item);
  }
  return {
    ...board,
    sections: board.sections.map((section) => {
      if (section.id !== containerId || section.kind !== "container") return section;
      return { ...section, options: updatedOptions };
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
    (item) => item.id === id && item.layouts.some((layout) => layout.sectionId === containerId),
  );
};
