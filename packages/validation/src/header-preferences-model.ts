export const headerZoneIds = ["left", "center", "right"] as const;

export type HeaderZoneId = (typeof headerZoneIds)[number];

type HeaderItemKeyInput =
  | { type: "builtin"; id: string }
  | { type: "board"; boardId: string }
  | { type: "widget"; id: string };

export const getHeaderItemKey = (item: HeaderItemKeyInput): string => {
  if (item.type === "board") return `board:${item.boardId}`;
  if (item.type === "widget") return `widget:${item.id}`;
  return `builtin:${item.id}`;
};

export const getHeaderItems = <TItem>(zones: Record<HeaderZoneId, TItem[]>): TItem[] =>
  headerZoneIds.flatMap((zone) => zones[zone]);
