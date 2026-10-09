import type { WazuhTimeRange } from "@homarr/integrations/types";

export const wazuhViews = [
  "overview",
  "alerts",
  "timeline",
  "top",
  "agents",
  "vulnerabilities",
  "fim",
  "authFailures",
] as const;
export type WazuhView = (typeof wazuhViews)[number];

const isWazuhView = (value: unknown): value is WazuhView =>
  typeof value === "string" && (wazuhViews as readonly string[]).includes(value);

/** Visible tabs in their canonical order. An empty or invalid selection falls back to all tabs. */
export const getVisibleWazuhViews = (visibleViews: readonly string[]): WazuhView[] => {
  const selected = wazuhViews.filter((view) => visibleViews.includes(view));
  return selected.length > 0 ? selected : [...wazuhViews];
};

/** The saved tab if it is still visible, otherwise the first visible tab. */
export const resolveWazuhView = (view: unknown, visibleViews: readonly WazuhView[]): WazuhView => {
  if (isWazuhView(view) && visibleViews.includes(view)) return view;
  return visibleViews[0] ?? "overview";
};

const rangeHours: Record<WazuhTimeRange, number> = { "1h": 1, "24h": 24, "7d": 168, "30d": 720 };

export const getWazuhRangeHours = (range: WazuhTimeRange) => rangeHours[range];
