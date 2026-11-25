export const getSmartContainerChromeHeight = (showPeeks: boolean) => {
  if (showPeeks) return 140;
  return 44;
};

export const getSmartContainerStateLabel = (title: string | undefined, label: string, index: number) =>
  title?.trim() || `${label} ${Math.max(0, index) + 1}`;
