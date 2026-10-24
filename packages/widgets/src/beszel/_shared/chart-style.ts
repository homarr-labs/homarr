export const chartStyle = {
  minWidth: 0,
  minHeight: 1,
  flexGrow: 1,
  flexShrink: 0,
  // Recharts measures pixels; keep points, axes and tooltips readable on a scaled board.
  zoom: "var(--board-canvas-inverse-scale, 1)",
} as const;
