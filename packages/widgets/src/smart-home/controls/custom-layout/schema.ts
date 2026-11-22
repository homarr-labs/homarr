import { z } from "zod/v4";

/**
 * The custom layout of a smart home widget, stored in its options. Cards sit on a fixed 12-column grid;
 * narrower widgets derive their arrangement from it without changing what is stored.
 */
export const SMART_HOME_LAYOUT_VERSION = 1;
export const SMART_HOME_LAYOUT_COLUMNS = 12;
/** The layout is a 12 × 12 grid over the widget: card sizes are shares of the widget's width and height. */
export const SMART_HOME_LAYOUT_ROWS = 12;
export const SMART_HOME_LAYOUT_MAX_CARDS = 40;
export const SMART_HOME_LAYOUT_MAX_ELEMENTS = 40;
export const SMART_HOME_LAYOUT_MAX_TEMPLATES = 20;
/** Comparison values in rules and conditions. */
export const SMART_HOME_COMPARISON_MAX = 64;
/** The largest factor a value can be multiplied by. */
export const SMART_HOME_FACTOR_MAX = 1_000_000;
/** Card titles and element labels; longer text would make the stored layout invalid. */
export const SMART_HOME_LAYOUT_MAX_TEXT = 80;
export const SMART_HOME_ELEMENT_MAX_RULES = 6;
export const SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES = 12;
export const SMART_HOME_CARD_MIN = { w: 2, h: 2 } as const;

export const smartHomeLayoutModes = ["automatic", "custom"] as const;
export type SmartHomeLayoutMode = (typeof smartHomeLayoutModes)[number];

/** How an element shows its entity; one entity may appear several times in different views. */
export const smartHomeElementViews = [
  "control",
  "tile",
  "slider",
  "pill",
  "button",
  "camera",
  "value",
  "group",
  "chip",
  "row",
  "graph",
  "status",
  "battery",
  "heading",
  "divider",
  "spacer",
] as const;
export type SmartHomeElementView = (typeof smartHomeElementViews)[number];

/** Views without an entity: they only structure a card. */
export const staticElementViews = new Set<SmartHomeElementView>(["heading", "divider", "spacer"]);
/** Views with a label (icon and text); the text can be hidden. */
export const labelledElementViews = new Set<SmartHomeElementView>([
  "button",
  "camera",
  "control",
  "row",
  "tile",
  "value",
  "group",
  "graph",
  "status",
  "battery",
]);
/**
 * Entities a tile shows as their full control center tile (dial, player, ...), named and drawn by that tile, unless
 * they have a slider and so get the device card header like other devices.
 */
export const fullTileDomains = new Set([
  "climate",
  "water_heater",
  "humidifier",
  "media_player",
  "vacuum",
  "alarm_control_panel",
  "camera",
]);
/** Views that show an icon the user can replace: every labelled view, plus the ones built around an icon. */
export const iconElementViews = new Set<SmartHomeElementView>([...labelledElementViews, "pill", "button", "heading"]);
/** How the view picker groups the views: what controls an entity, and what only shows it. */
export const controlElementViews = new Set<SmartHomeElementView>([
  "tile",
  "control",
  "slider",
  "pill",
  "button",
  "row",
]);
/** Parts of an element that can be switched off; which ones an element offers depends on its view and entity. */
export const smartHomeElementParts = [
  "icon",
  "cover",
  "artist",
  "progress",
  "skip",
  "volume",
  "power",
  "stepper",
  "modes",
  "currentTemperature",
  "status",
] as const;
export type SmartHomeElementPart = (typeof smartHomeElementParts)[number];

const iconPartViews = new Set<SmartHomeElementView>(["control", "value", "group", "graph", "status", "battery"]);
const climateDomains = new Set(["climate", "water_heater"]);

/** The parts an element can hide, in the order the editor lists them. */
export const getElementParts = (view: SmartHomeElementView, domain: string | undefined): SmartHomeElementPart[] => {
  if (iconPartViews.has(view)) return ["icon"];
  if (view === "camera") return ["status"];
  if (view !== "tile") return [];
  if (domain === "media_player") return ["cover", "artist", "progress", "skip", "volume"];
  if (domain && climateDomains.has(domain)) return ["power", "currentTemperature", "stepper", "modes"];
  return [];
};

/** Views that show a number the user can format and color by rules. */
export const valueElementViews = new Set<SmartHomeElementView>(["value", "group", "status", "graph"]);

/** Colors a rule or a card accent can use; Mantine's palette, so they follow the theme. */
export const smartHomeLayoutColors = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "violet",
  "pink",
  "gray",
] as const;
export type SmartHomeLayoutNamedColor = (typeof smartHomeLayoutColors)[number];
/** A palette color by name (follows the theme), or a custom one as #rrggbb. */
export type SmartHomeLayoutColor = SmartHomeLayoutNamedColor | `#${string}`;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const isNamedLayoutColor = (color: string): color is SmartHomeLayoutNamedColor =>
  (smartHomeLayoutColors as readonly string[]).includes(color);

export const smartHomeCardColors = ["state", "accent"] as const;
export type SmartHomeCardColors = (typeof smartHomeCardColors)[number];

export const smartHomeCompareOperators = ["gt", "lt", "eq", "ne"] as const;
export type SmartHomeCompareOperator = (typeof smartHomeCompareOperators)[number];

export const smartHomeAggregates = ["sum", "avg", "min", "max", "on"] as const;
export type SmartHomeAggregate = (typeof smartHomeAggregates)[number];

/** History windows a graph can show, in hours. */
export const smartHomeGraphRanges = [1, 6, 24, 168] as const;

const idSchema = z.string().min(1).max(64);
/** A Tabler icon name such as "bolt" or "air-conditioning", drawn from the icon sprite. */
const iconNameSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const entityIdSchema = z.string().min(1).max(255);
const colorSchema = z.union([
  z.enum(smartHomeLayoutColors),
  z.custom<`#${string}`>((value) => typeof value === "string" && HEX_COLOR.test(value)),
]);

const comparisonSchema = z.object({
  op: z.enum(smartHomeCompareOperators),
  value: z.string().max(SMART_HOME_COMPARISON_MAX),
});

const ruleSchema = comparisonSchema.extend({ color: colorSchema });

const conditionSchema = comparisonSchema.extend({
  /** Another entity whose state decides; without it, the element's own entity does. */
  entityId: entityIdSchema.optional(),
  /** While hidden, rows that hold only hidden elements shrink away and the card's other rows share their space. */
  collapse: z.boolean().optional(),
});

/** Everything about an element except where it is and which entity it shows. */
const elementOptionsSchema = z.object({
  view: z.enum(smartHomeElementViews),
  label: z.string().max(SMART_HOME_LAYOUT_MAX_TEXT).optional(),
  hideLabel: z.boolean().optional(),
  icon: iconNameSchema.optional(),
  /** Shows the entity without letting anyone control it from here. */
  readOnly: z.boolean().optional(),
  /** Value colors, first match wins. */
  rules: z.array(ruleSchema).max(SMART_HOME_ELEMENT_MAX_RULES).optional(),
  /** The element only shows while this holds. */
  condition: conditionSchema.optional(),
  /** More entities for a group value or a graph with several lines. */
  entityIds: z.array(entityIdSchema).max(SMART_HOME_ELEMENT_MAX_EXTRA_ENTITIES).optional(),
  aggregate: z.enum(smartHomeAggregates).optional(),
  /** Graph history window in hours; 24 when not set. */
  range: z
    .number()
    .int()
    .refine((value) => (smartHomeGraphRanges as readonly number[]).includes(value))
    .optional(),
  showMinMax: z.boolean().optional(),
  /** Parts of the element that are switched off, e.g. a player's cover or a thermostat's mode buttons. */
  hide: z.array(z.enum(smartHomeElementParts)).max(smartHomeElementParts.length).optional(),
  /** Camera: false shows only the snapshot, even when the camera can stream. */
  live: z.boolean().optional(),
  /** Heading: where its text sits in the element; at the start when not set. */
  align: z.enum(["start", "center", "end"]).optional(),
  decimals: z.number().int().min(0).max(3).optional(),
  unit: z.string().max(12).optional(),
  /** Multiplies numeric values, e.g. 0.001 to show W as kW. */
  factor: z.number().positive().max(SMART_HOME_FACTOR_MAX).optional(),
  // Position on the card's own grid; elements without one stack automatically.
  x: z
    .number()
    .int()
    .min(0)
    .max(SMART_HOME_LAYOUT_COLUMNS - 1)
    .optional(),
  y: z
    .number()
    .int()
    .min(0)
    .max(SMART_HOME_LAYOUT_ROWS - 1)
    .optional(),
  w: z.number().int().min(1).max(SMART_HOME_LAYOUT_COLUMNS).optional(),
  h: z.number().int().min(1).max(SMART_HOME_LAYOUT_ROWS).optional(),
});

const elementSchema = elementOptionsSchema.extend({
  id: idSchema,
  /** The integration the entity comes from; elements of another integration show as unavailable. */
  source: z.string().max(64),
  /** Empty for static elements (heading, divider, spacer). */
  entityId: z.string().max(255),
});

const cardSchema = z.object({
  id: idSchema,
  x: z
    .number()
    .int()
    .min(0)
    .max(SMART_HOME_LAYOUT_COLUMNS - 1),
  y: z
    .number()
    .int()
    .min(0)
    .max(SMART_HOME_LAYOUT_ROWS - 1),
  w: z.number().int().min(1).max(SMART_HOME_LAYOUT_COLUMNS),
  h: z.number().int().min(1).max(SMART_HOME_LAYOUT_ROWS),
  title: z.string().max(SMART_HOME_LAYOUT_MAX_TEXT).optional(),
  /** How the card colors what is on: the primary color (unset), each entity's own color, or the card's accent. */
  colors: z.enum(smartHomeCardColors).optional(),
  accent: colorSchema.optional(),
  /** Tints the card in its first entity's color while that entity is on. */
  tint: z.boolean().optional(),
  /** Nothing on this card can be controlled; the widget's own read-only setting covers every card. */
  readOnly: z.boolean().optional(),
  elements: z.array(elementSchema).max(SMART_HOME_LAYOUT_MAX_ELEMENTS),
});

/**
 * A card saved for reuse. Elements remember what kind of entity they showed instead of the entity itself, so the
 * template can be applied to another device with the same kind of entities.
 */
const templateElementSchema = elementOptionsSchema.extend({
  match: z.object({
    domain: z.string().max(64),
    deviceClass: z.string().max(64).optional(),
    /** The entity's name without the device, e.g. "Power". */
    name: z.string().max(120).optional(),
  }),
  /** Elements that showed the same entity share a key, so they show the same entity again. */
  binding: z.string().max(16).optional(),
});

const templateSchema = z.object({
  id: idSchema,
  name: z.string().min(1).max(80),
  w: z.number().int().min(1).max(SMART_HOME_LAYOUT_COLUMNS),
  h: z.number().int().min(1).max(SMART_HOME_LAYOUT_ROWS),
  colors: z.enum(smartHomeCardColors).optional(),
  accent: colorSchema.optional(),
  tint: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  elements: z.array(templateElementSchema).max(SMART_HOME_LAYOUT_MAX_ELEMENTS),
});

export const smartHomeLayoutSchema = z.object({
  version: z.literal(SMART_HOME_LAYOUT_VERSION),
  cards: z.array(cardSchema).max(SMART_HOME_LAYOUT_MAX_CARDS),
  /** A separate arrangement for narrow widgets (phones); without it, cards stack automatically. */
  narrowCards: z.array(cardSchema).max(SMART_HOME_LAYOUT_MAX_CARDS).optional(),
  templates: z.array(templateSchema).max(SMART_HOME_LAYOUT_MAX_TEMPLATES).optional(),
});

export type SmartHomeLayoutElement = z.infer<typeof elementSchema>;
export type SmartHomeLayoutCard = z.infer<typeof cardSchema>;
export type SmartHomeLayoutTemplate = z.infer<typeof templateSchema>;
export type SmartHomeLayoutTemplateElement = z.infer<typeof templateElementSchema>;
export type SmartHomeLayoutRule = z.infer<typeof ruleSchema>;
export type SmartHomeLayoutCondition = z.infer<typeof conditionSchema>;
export type SmartHomeLayout = z.infer<typeof smartHomeLayoutSchema>;

export const emptySmartHomeLayout: SmartHomeLayout = { version: SMART_HOME_LAYOUT_VERSION, cards: [] };

/** Cards and elements never reach past the widget's (or their card's) right and bottom edges. */
const fitCard = (card: SmartHomeLayoutCard): SmartHomeLayoutCard => ({
  ...card,
  w: Math.min(card.w, SMART_HOME_LAYOUT_COLUMNS - card.x),
  h: Math.min(card.h, SMART_HOME_LAYOUT_ROWS - card.y),
});

/** The first element of each id; a second one with the same id would take the first one's place on the card. */
const uniqueElements = <TElement extends { id: string }>(elements: readonly TElement[]) => {
  const seen = new Set<string>();
  return elements.filter((element) => !seen.has(element.id) && Boolean(seen.add(element.id)));
};

const withUniqueElements = (card: SmartHomeLayoutCard): SmartHomeLayoutCard => ({
  ...card,
  elements: uniqueElements(card.elements),
});

/** Keeps every valid card (and every valid element in it) of a stored list; drops the rest one by one. */
const salvageCards = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((card: unknown) => {
      if (typeof card !== "object" || card === null) return [];
      const elements = "elements" in card && Array.isArray(card.elements) ? card.elements : [];
      const valid = elements.flatMap((element: unknown) => elementSchema.safeParse(element).data ?? []);
      const result = cardSchema.safeParse({
        ...card,
        elements: uniqueElements(valid).slice(0, SMART_HOME_LAYOUT_MAX_ELEMENTS),
      });
      return result.data ? [fitCard(result.data)] : [];
    })
    .slice(0, SMART_HOME_LAYOUT_MAX_CARDS);
};

/**
 * Reads a stored layout without ever throwing. Broken cards, elements or templates are dropped one by one, so a
 * single bad entry (e.g. from a newer version) never takes the whole layout with it.
 */
export const parseSmartHomeLayout = (value: unknown): SmartHomeLayout => {
  const parsed = smartHomeLayoutSchema.safeParse(value);
  if (parsed.success) {
    return {
      ...parsed.data,
      cards: parsed.data.cards.map((card) => fitCard(withUniqueElements(card))),
      narrowCards: parsed.data.narrowCards?.map((card) => fitCard(withUniqueElements(card))),
    };
  }
  if (typeof value !== "object" || value === null || !("cards" in value)) return emptySmartHomeLayout;
  const narrowCards = "narrowCards" in value && Array.isArray(value.narrowCards) ? salvageCards(value.narrowCards) : [];
  const templates =
    "templates" in value && Array.isArray(value.templates)
      ? value.templates.flatMap((template: unknown) => templateSchema.safeParse(template).data ?? [])
      : [];
  return {
    version: SMART_HOME_LAYOUT_VERSION,
    cards: salvageCards(value.cards),
    ...(narrowCards.length > 0 ? { narrowCards } : {}),
    ...(templates.length > 0 ? { templates: templates.slice(0, SMART_HOME_LAYOUT_MAX_TEMPLATES) } : {}),
  };
};

const allCards = (layout: SmartHomeLayout) => [...layout.cards, ...(layout.narrowCards ?? [])];

/** Every entity an element needs: its own, the extra ones of a group or graph and the one its condition reads. */
export const getElementEntityIds = (element: SmartHomeLayoutElement) =>
  [element.entityId, ...(element.entityIds ?? []), element.condition?.entityId ?? ""].filter(Boolean);

/** Every entity the layout shows, once, so the live subscription asks for each entity a single time. */
export const getLayoutEntityIds = (layout: SmartHomeLayout, source: string | null) => [
  ...new Set(
    allCards(layout).flatMap((card) =>
      card.elements.filter((element) => element.source === source).flatMap(getElementEntityIds),
    ),
  ),
];

/** A graph with its own window or several lines loads its history itself; the others share the default one. */
export const hasOwnGraphHistory = (element: SmartHomeLayoutElement) =>
  element.view === "graph" && ((element.range ?? 24) !== 24 || (element.entityIds?.length ?? 0) > 0);

/** Only entities shown in a default graph need the shared history. */
export const getLayoutGraphEntityIds = (layout: SmartHomeLayout, source: string | null) => [
  ...new Set(
    allCards(layout).flatMap((card) =>
      card.elements
        .filter((element) => element.source === source && element.view === "graph" && !hasOwnGraphHistory(element))
        .map((element) => element.entityId),
    ),
  ),
];
