import type { DynamicSection, EmptySection, Item } from "~/app/[locale]/boards/_types";

export const createEmptySection = (id: string, yOffset: number): EmptySection => ({
  id,
  kind: "empty",
  yOffset,
  xOffset: 0,
  items: [],
});

export const createDynamicSection = (section: Omit<Partial<DynamicSection>, "kind">): DynamicSection => ({
  id: section.id ?? "0",
  kind: "dynamic",
  parentSectionId: section.parentSectionId ?? "0",
  height: section.height ?? 1,
  width: section.width ?? 1,
  yOffset: section.yOffset ?? 0,
  xOffset: section.xOffset ?? 0,
  items: section.items ?? [],
});

export const createItem = (item: Partial<Item>): Item => ({
  id: item.id ?? "0",
  width: item.width ?? 1,
  height: item.height ?? 1,
  yOffset: item.yOffset ?? 0,
  xOffset: item.xOffset ?? 0,
  kind: item.kind ?? "clock",
  integrationIds: item.integrationIds ?? [],
  options: item.options ?? {},
  advancedOptions: item.advancedOptions ?? { customCssClasses: [] },
});
