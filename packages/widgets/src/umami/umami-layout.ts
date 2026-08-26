interface UmamiLayoutInput {
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

export const getUmamiLayout = ({ width, height, displayMode }: UmamiLayoutInput) => {
  const isAdvanced = displayMode === "advanced";
  return {
    isDense: !isAdvanced && height < 120,
    showXAxis: true,
    showSecondaryStats: true,
    showDetailedStats: true,
    stackAdvancedContent: isAdvanced && width < 900,
  };
};
