export const longPressMoveTolerancePx = 10;

export const hasExceededLongPressMoveTolerance = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  tolerance = longPressMoveTolerancePx,
) => Math.hypot(current.x - start.x, current.y - start.y) > tolerance;
