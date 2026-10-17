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
