export const parseThemeLength = (value: unknown) => {
  const text = String(value ?? "").replace(/^calc\(([-\d.]+\w+) \* var\(--mantine-scale\)\)$/u, "$1");
  const match = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)(px|rem|em|%)?$/iu.exec(text.trim());
  if (!match) return null;
  const number = Number(match[1]);
  if (!Number.isFinite(number)) return null;
  return { number, unit: match[2] ?? "" };
};

export const themeLengthPixels = (value: unknown) => {
  const length = parseThemeLength(value);
  if (!length) return null;
  if (length.unit === "rem" || length.unit === "em") return length.number * 16;
  if (length.unit === "px" || length.unit === "") return length.number;
  return null;
};
