interface UmamiLayoutInput {
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

export const getUmamiLayout = ({ width, height, displayMode }: UmamiLayoutInput) => {
  const isAdvanced = displayMode === "advanced";
  return {
    isDense: !isAdvanced && height < 120,
    showXAxis: isAdvanced || (width >= 220 && height >= 150),
    showSecondaryStats: isAdvanced || (width >= 220 && height >= 180),
    showDetailedStats: isAdvanced || (width >= 360 && height >= 240),
    stackAdvancedContent: isAdvanced && width < 900,
  };
};
