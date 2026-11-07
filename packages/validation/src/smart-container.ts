import { z } from "zod/v4";

export const smartContainerStateLimit = 32;
export const smartContainerStateItemLimit = 128;

export const smartContainerStateSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().trim().max(64).default(""),
  priority: z.number().int().min(0).max(100).default(50),
  enabled: z.boolean().default(true),
  itemIds: z.array(z.string().min(1).max(128)).max(smartContainerStateItemLimit).default([]),
});

export const smartContainerOptionsSchema = z
  .object({
    enabled: z.boolean().default(false),
    mode: z.enum(["manual", "timed", "smart", "hybrid"]).default("hybrid"),
    intervalSeconds: z.number().int().min(5).max(3600).default(12),
    skipInactive: z.boolean().default(true),
    pauseOnHover: z.boolean().default(true),
    reclaimSpace: z.boolean().default(true),
    compactQuiet: z.boolean().default(true),
    minActiveRows: z.number().int().min(1).max(24).default(1),
    maxActiveRows: z.number().int().min(1).max(24).default(12),
    appearance: z.enum(["reel", "compact"]).default("reel"),
    fallbackStateId: z.string().min(1).max(128).optional(),
    states: z.array(smartContainerStateSchema).max(smartContainerStateLimit).default([]),
  })
  .superRefine((options, ctx) => {
    if (options.enabled && !options.states.some((state) => state.enabled)) {
      ctx.addIssue({
        code: "custom",
        message: "Smart containers require at least one automatic state",
        path: ["states"],
      });
    }
    if (
      options.fallbackStateId &&
      !options.states.some((state) => state.enabled && state.id === options.fallbackStateId)
    ) {
      ctx.addIssue({ code: "custom", message: "Fallback must refer to an enabled state", path: ["fallbackStateId"] });
    }
    if (options.minActiveRows > options.maxActiveRows) {
      ctx.addIssue({ code: "custom", message: "Minimum rows cannot exceed maximum rows", path: ["maxActiveRows"] });
    }

    const stateIds = new Set<string>();
    const itemIds = new Set<string>();
    options.states.forEach((state, stateIndex) => {
      if (stateIds.has(state.id)) {
        ctx.addIssue({ code: "custom", message: "State IDs must be unique", path: ["states", stateIndex, "id"] });
      }
      stateIds.add(state.id);
      state.itemIds.forEach((itemId, itemIndex) => {
        if (itemIds.has(itemId)) {
          ctx.addIssue({
            code: "custom",
            message: "A widget can belong to only one state in a container",
            path: ["states", stateIndex, "itemIds", itemIndex],
          });
        }
        itemIds.add(itemId);
      });
    });
  });

export type SmartContainerState = z.infer<typeof smartContainerStateSchema>;
export type SmartContainerOptions = z.infer<typeof smartContainerOptionsSchema>;

export const resolveSmartContainerMembership = (
  states: readonly SmartContainerState[],
  availableIds: ReadonlySet<string>,
  assignUnassigned = true,
): SmartContainerState[] => {
  const assignedIds = new Set<string>();
  const resolved = states.map((state) => {
    const itemIds = state.itemIds.filter((itemId) => {
      if (!availableIds.has(itemId) || assignedIds.has(itemId)) return false;
      assignedIds.add(itemId);
      return true;
    });
    if (itemIds.length === state.itemIds.length) return state;
    return { ...state, itemIds };
  });
  if (!assignUnassigned) return resolved;
  const unassignedIds = [...availableIds].filter((itemId) => !assignedIds.has(itemId));
  let nextUnassignedIndex = 0;
  return resolved.map((state) => {
    if (!state.enabled || nextUnassignedIndex >= unassignedIds.length) return state;
    const capacity = smartContainerStateItemLimit - state.itemIds.length;
    if (capacity <= 0) return state;
    const additional = unassignedIds.slice(nextUnassignedIndex, nextUnassignedIndex + capacity);
    nextUnassignedIndex += additional.length;
    return { ...state, itemIds: [...state.itemIds, ...additional] };
  });
};

interface SmartContainerSection {
  id: string;
  kind: string;
  options?: { smart?: SmartContainerOptions };
  layouts?: readonly { layoutId: string }[];
}

interface SmartContainerItem {
  id: string;
  layouts: readonly { sectionId: string; layoutId: string }[];
}

/** Keep state membership aligned with native widget placement after editor changes. */
export const reconcileSmartContainerStates = <TSection extends SmartContainerSection>(
  sections: TSection[],
  items: readonly SmartContainerItem[],
): TSection[] => {
  let membershipChanged = false;
  const reconciledSections = sections.map((section) => {
    const smart = section.options?.smart;
    if (section.kind !== "container" || !smart || smart.states.length === 0) return section;

    const containerLayoutIds = new Set(section.layouts?.map((layout) => layout.layoutId));
    const memberIds = [
      ...new Set(
        items
          .filter((item) =>
            item.layouts.some((layout) => layout.sectionId === section.id && containerLayoutIds.has(layout.layoutId)),
          )
          .map((item) => item.id),
      ),
    ];
    const states = resolveSmartContainerMembership(smart.states, new Set(memberIds), smart.enabled);
    if (states.every((state, index) => state === smart.states[index])) return section;
    membershipChanged = true;
    return { ...section, options: { ...section.options, smart: { ...smart, states } } };
  });
  if (!membershipChanged) return sections;
  return reconciledSections;
};

/** Remap stable widget references when a board is duplicated. */
export const remapSmartContainerItems = (
  smart: SmartContainerOptions,
  itemIds: ReadonlyMap<string, string>,
): SmartContainerOptions => ({
  ...smart,
  states: smart.states.map((state) => ({
    ...state,
    itemIds: state.itemIds.flatMap((itemId) => {
      const mappedId = itemIds.get(itemId);
      if (!mappedId) return [];
      return [mappedId];
    }),
  })),
});
