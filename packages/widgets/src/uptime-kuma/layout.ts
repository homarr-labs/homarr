export type UptimeKumaLayout = "tile" | "strip" | "column" | "board";

const compactBreakpoint = 230;
const minimumColumnWidth = 430;
const minimumInlineRowWidth = 430;
const minimumTaggedRowWidth = 600;
const maximumColumns = 3;

export const getUptimeKumaLayout = (width: number, height: number, isAdvanced: boolean): UptimeKumaLayout => {
  if (isAdvanced) return "board";
  const isNarrow = width < compactBreakpoint;
  const isShort = height < compactBreakpoint;
  if (isNarrow && isShort) return "tile";
  if (isShort) return "strip";
  if (isNarrow) return "column";
  return "board";
};

export const getMonitorColumnCount = (width: number) =>
  Math.min(maximumColumns, Math.max(1, Math.floor(width / minimumColumnWidth)));

export const usesInlineRows = (width: number, columnCount: number) => width / columnCount >= minimumInlineRowWidth;

export const showsInlineTags = (width: number, columnCount: number) => width / columnCount >= minimumTaggedRowWidth;

export interface BreakdownLayout {
  kind: "inline" | "grid" | "list";
  rows: number;
}

const smallCharacterWidth = 6.2;
const headlineCharacterWidth = 8.2;
const headlineIconWidth = 26;
const breakdownItemChrome = 18;
export const summaryGap = 12;

export const estimateSmallTextWidth = (text: string) => text.length * smallCharacterWidth;

export const fitsHeadline = (text: string, availableWidth: number) =>
  text.length * headlineCharacterWidth + headlineIconWidth <= availableWidth;

export const getBreakdownLayout = (items: readonly string[], availableWidth: number): BreakdownLayout => {
  const widths = items.map((item) => breakdownItemChrome + estimateSmallTextWidth(item));
  const inlineWidth = widths.reduce((total, width) => total + width, 0) + summaryGap * Math.max(0, widths.length - 1);
  if (inlineWidth <= availableWidth) return { kind: "inline", rows: 1 };

  const columnWidth = (column: number) => Math.max(0, ...widths.filter((_, index) => index % 2 === column));
  if (columnWidth(0) + summaryGap + columnWidth(1) <= availableWidth) {
    return { kind: "grid", rows: Math.ceil(widths.length / 2) };
  }
  return { kind: "list", rows: widths.length };
};
