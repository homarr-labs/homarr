interface UmamiLayoutInput {
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

export const getUmamiLayout = ({ width, height, displayMode }: UmamiLayoutInput) => {
  const isAdvanced = displayMode === "advanced";
  return {
    isDense: !isAdvanced && height < 120,
    showXAxis: isAdvanced || height >= 140,
    showSecondaryStats: isAdvanced || height >= 96,
    showDetailedStats: isAdvanced || (width >= 260 && height >= 150),
    stackAdvancedContent: isAdvanced && width < 900,
  };
};
