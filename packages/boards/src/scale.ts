export const calculateBoardUiScale = (canvasScale: number) => {
  if (!Number.isFinite(canvasScale) || canvasScale <= 0) return 1;

  return 1 / canvasScale;
};
