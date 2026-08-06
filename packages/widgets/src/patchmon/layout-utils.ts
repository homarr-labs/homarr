const gridColsByWidth = [
  { minWidth: 500, cols: 4 },
  { minWidth: 380, cols: 3 },
  { minWidth: 220, cols: 2 },
  { minWidth: 0, cols: 1 },
] as const;

export function getGridCols(width: number): number {
  const match = gridColsByWidth.find(({ minWidth }) => width >= minWidth);
  return match?.cols ?? 1;
}

export function shouldShowComplianceHeroText(width: number): boolean {
  return getGridCols(width) >= 2;
}
