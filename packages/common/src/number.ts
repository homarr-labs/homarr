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

export const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 *  Number of bytes to si format. (division by 1024)
 *  Does not accept floats, size in bytes are should be integer.
 */
export const humanFileSize = (size: number): string => {
  //64bit limit for Number stops at EiB
  const siRanges = ["B", "kiB", "MiB", "GiB", "TiB", "PiB", "EiB"];
  if (!Number.isInteger(size)) {
    console.warn("Invalid use of the humanFileSize function with a float, please report this and what integration this is impacting.")
    //Not an Integer
    return "NaI";
  }
  let count = 0;
  while (count < siRanges.length) {
    const tempSize = size / Math.pow(1024, count);
    if (tempSize < 1024) {
      return tempSize.toFixed(Math.min(count, 1)) + siRanges[count];
    }
    count++;
  }
  return "∞";
};
