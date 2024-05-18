const ranges = [
  { divider: 1e18, suffix: "E" },
  { divider: 1e15, suffix: "P" },
  { divider: 1e12, suffix: "T" },
  { divider: 1e9, suffix: "G" },
  { divider: 1e6, suffix: "M" },
  { divider: 1e3, suffix: "k" },
];

export const formatNumber = (value: number, decimalPlaces: number) => {
  for (const range of ranges) {
    if (value < range.divider) continue;

    return (value / range.divider).toFixed(decimalPlaces) + range.suffix;
  }
  return value.toFixed(decimalPlaces);
};

export const formatPercentage = (value: number, decimalPlaces: number) => {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
};
