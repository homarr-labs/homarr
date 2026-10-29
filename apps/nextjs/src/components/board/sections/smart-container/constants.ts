export const getSmartContainerChromeHeight = (stateCount: number, rows: number) => {
  if (stateCount > 1 && rows >= 3) return 140;
  return 44;
};
