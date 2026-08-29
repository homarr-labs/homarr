import { z } from "zod/v4";

export const headerPreferencesVersion = 3 as const;

export const headerBuiltinItemIds = [
  "logo",
  "search",
  "home",
  "boardSwitcher",
  "assistant",
  "docker",
  "boardEdit",
  "boardSettings",
  "settings",
  "themeToggle",
  "user",
] as const;

export const requiredHeaderBuiltinItemIds = ["user"] as const;

export const headerPreferenceItemIds = headerBuiltinItemIds;
export const headerItemIds = headerBuiltinItemIds;

export type HeaderBuiltinItemId = (typeof headerBuiltinItemIds)[number];
export type HeaderPreferenceItemId = HeaderBuiltinItemId;

export const headerZoneIds = ["left", "center", "right"] as const;
export const headerSearchDisplayValues = ["input", "icon"] as const;
export const headerLogoDisplayValues = ["logo", "logoAndText"] as const;

export type HeaderZoneId = (typeof headerZoneIds)[number];
export type HeaderSearchDisplay = (typeof headerSearchDisplayValues)[number];
export type HeaderLogoDisplay = (typeof headerLogoDisplayValues)[number];

const headerBuiltinItemSchema = z
  .object({
    type: z.literal("builtin"),
    id: z.enum(headerBuiltinItemIds),
  })
  .strict();

const headerBoardItemSchema = z
  .object({
    type: z.literal("board"),
    boardId: z.string().min(1).max(255),
  })
  .strict();

export const headerItemSchema = z.discriminatedUnion("type", [headerBuiltinItemSchema, headerBoardItemSchema]);

export type HeaderBuiltinItem = z.infer<typeof headerBuiltinItemSchema>;
export type HeaderBoardItem = z.infer<typeof headerBoardItemSchema>;
export type HeaderItem = z.infer<typeof headerItemSchema>;
export type HeaderItemId = HeaderItem;
export type HeaderZones = Record<HeaderZoneId, HeaderItem[]>;

export const createBuiltinHeaderItem = (id: HeaderBuiltinItemId): HeaderBuiltinItem => ({ type: "builtin", id });

export const createBoardHeaderItem = (boardId: string): HeaderBoardItem => ({ type: "board", boardId });

export const isRequiredHeaderItem = (item: HeaderItem) =>
  item.type === "builtin" && requiredHeaderBuiltinItemIds.some((itemId) => itemId === item.id);

export const getHeaderItemKey = (item: HeaderItem): string => {
  if (item.type === "board") return `board:${item.boardId}`;
  return `builtin:${item.id}`;
};

export const getHeaderItems = (zones: HeaderZones): HeaderItem[] => headerZoneIds.flatMap((zone) => zones[zone]);

export const getHeaderItemZone = (zones: HeaderZones, item: HeaderItem): HeaderZoneId | undefined => {
  const itemKey = getHeaderItemKey(item);
  return headerZoneIds.find((zone) => zones[zone].some((candidate) => getHeaderItemKey(candidate) === itemKey));
};

export const getDefaultHeaderZone = (item: HeaderItem): HeaderZoneId => {
  if (item.type === "board") return "right";
  if (item.id === "logo") return "left";
  if (item.id === "search") return "center";
  return "right";
};

const headerItemListSchema = z.array(headerItemSchema).max(100);

const headerZonesSchema = z
  .object({
    left: headerItemListSchema,
    center: headerItemListSchema,
    right: headerItemListSchema,
  })
  .strict()
  .refine((zones) => getHeaderItems(zones).length > 0, "At least one header item is required")
  .refine((zones) => {
    const itemKeys = getHeaderItems(zones).map(getHeaderItemKey);
    return new Set(itemKeys).size === itemKeys.length;
  }, "Header items must be unique")
  .refine(
    (zones) => getHeaderItems(zones).some((item) => item.type === "builtin" && item.id === "user"),
    "Account access must remain in the header",
  );

export const headerPreferencesSchema = z
  .object({
    version: z.literal(headerPreferencesVersion),
    visible: z.boolean(),
    searchDisplay: z.enum(headerSearchDisplayValues),
    logoDisplay: z.enum(headerLogoDisplayValues).default("logoAndText"),
    autoHideOnScroll: z.boolean().default(false),
    zones: headerZonesSchema,
  })
  .strict();

export type HeaderPreferences = z.infer<typeof headerPreferencesSchema>;

const legacyHeaderItemIds = ["logo", "search", "boardSwitcher", "assistant", "docker", "user"] as const;
type LegacyHeaderItemId = (typeof legacyHeaderItemIds)[number];

const legacyHeaderItemListSchema = z
  .array(z.enum(legacyHeaderItemIds))
  .min(1)
  .max(legacyHeaderItemIds.length)
  .refine((items) => new Set(items).size === items.length, "Header items must be unique")
  .refine((items) => items.includes("user"), "Account access must remain in the header");

const legacyHeaderPreferencesV1Schema = z
  .object({
    version: z.literal(1),
    visible: z.boolean(),
    items: legacyHeaderItemListSchema,
  })
  .strict();

const legacyHeaderPreferencesV2Schema = z
  .object({
    version: z.literal(2),
    visible: z.boolean(),
    zones: z
      .object({
        left: z.array(z.enum(legacyHeaderItemIds)).max(legacyHeaderItemIds.length),
        center: z.array(z.enum(legacyHeaderItemIds)).max(legacyHeaderItemIds.length),
        right: z.array(z.enum(legacyHeaderItemIds)).max(legacyHeaderItemIds.length),
      })
      .strict()
      .refine((zones) => {
        const items = headerZoneIds.flatMap((zone) => zones[zone]);
        return items.length > 0 && new Set(items).size === items.length && items.includes("user");
      }, "Header items must be unique and include account access"),
  })
  .strict();

const migrateLegacyItems = (
  visible: boolean,
  zones: Record<HeaderZoneId, LegacyHeaderItemId[]>,
): HeaderPreferences => ({
  version: headerPreferencesVersion,
  visible,
  searchDisplay: "input",
  logoDisplay: "logoAndText",
  autoHideOnScroll: false,
  zones: {
    left: zones.left.map(createBuiltinHeaderItem),
    center: zones.center.map(createBuiltinHeaderItem),
    right: zones.right.map(createBuiltinHeaderItem),
  },
});

const migrateLegacyHeaderPreferencesV1 = (
  legacy: z.infer<typeof legacyHeaderPreferencesV1Schema>,
): HeaderPreferences => {
  const zones: Record<HeaderZoneId, LegacyHeaderItemId[]> = { left: [], center: [], right: [] };
  for (const itemId of legacy.items) {
    const item = createBuiltinHeaderItem(itemId);
    zones[getDefaultHeaderZone(item)].push(itemId);
  }
  return migrateLegacyItems(legacy.visible, zones);
};

const migrateLegacyHeaderPreferencesV2 = (legacy: z.infer<typeof legacyHeaderPreferencesV2Schema>): HeaderPreferences =>
  migrateLegacyItems(legacy.visible, legacy.zones);

const includeRequiredHeaderItems = (preferences: HeaderPreferences): HeaderPreferences => {
  const itemKeys = new Set(getHeaderItems(preferences.zones).map(getHeaderItemKey));
  const missingItems = requiredHeaderBuiltinItemIds
    .map(createBuiltinHeaderItem)
    .filter((item) => !itemKeys.has(getHeaderItemKey(item)));
  if (missingItems.length === 0) return preferences;

  return {
    ...preferences,
    zones: {
      ...preferences.zones,
      right: [...preferences.zones.right, ...missingItems],
    },
  };
};

export const headerPreferencesMutationSchema = z
  .discriminatedUnion("version", [
    headerPreferencesSchema,
    legacyHeaderPreferencesV1Schema,
    legacyHeaderPreferencesV2Schema,
  ])
  .transform((preferences): HeaderPreferences => {
    if (preferences.version === 1) return includeRequiredHeaderItems(migrateLegacyHeaderPreferencesV1(preferences));
    if (preferences.version === 2) return includeRequiredHeaderItems(migrateLegacyHeaderPreferencesV2(preferences));
    return includeRequiredHeaderItems(preferences);
  });

export const defaultHeaderPreferences = {
  version: headerPreferencesVersion,
  visible: true,
  searchDisplay: "input",
  logoDisplay: "logoAndText",
  autoHideOnScroll: false,
  zones: {
    left: [createBuiltinHeaderItem("logo")],
    center: [createBuiltinHeaderItem("search")],
    right: [
      createBuiltinHeaderItem("boardEdit"),
      createBuiltinHeaderItem("boardSettings"),
      createBuiltinHeaderItem("user"),
    ],
  },
} satisfies HeaderPreferences;

export const defaultHeaderPreferencesSerialized = JSON.stringify(defaultHeaderPreferences);

export const parseHeaderPreferences = (value: unknown): HeaderPreferences => {
  try {
    const decoded = typeof value === "string" ? JSON.parse(value) : value;
    const parsed = headerPreferencesMutationSchema.safeParse(decoded);
    if (parsed.success) return parsed.data;
    return defaultHeaderPreferences;
  } catch {
    return defaultHeaderPreferences;
  }
};

export const serializeHeaderPreferences = (value: HeaderPreferences) =>
  JSON.stringify(includeRequiredHeaderItems(value));
