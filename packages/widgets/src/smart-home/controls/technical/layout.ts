export type OverviewTier = "tile" | "strip" | "list";
export type Level = 0 | 1 | 2;

export const getOverviewTier = (width: number, height: number): OverviewTier => {
  if (width < 230 && height < 230) return "tile";
  if (height < 150) return "strip";
  return "list";
};

export const getColumnCount = (width: number) => Math.min(3, Math.max(1, Math.floor(width / 380)));

export const getLevel = (rowWidth: number): Level => {
  if (rowWidth < 300) return 0;
  if (rowWidth < 440) return 1;
  return 2;
};
