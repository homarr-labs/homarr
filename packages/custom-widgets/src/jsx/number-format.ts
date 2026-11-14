import { SafeJsxError } from "./interpreter-foundation";

const numberFormatChoices: Readonly<Record<string, readonly string[]>> = {
  style: ["decimal", "percent", "currency", "unit"],
  notation: ["standard", "compact", "scientific", "engineering"],
  compactDisplay: ["short", "long"],
  currencyDisplay: ["symbol", "narrowSymbol", "code", "name"],
  unitDisplay: ["short", "long", "narrow"],
  signDisplay: ["auto", "always", "exceptZero", "negative", "never"],
};
const numberFormatDigitRanges: Readonly<Record<string, readonly [number, number]>> = {
  minimumIntegerDigits: [1, 21],
  minimumFractionDigits: [0, 20],
  maximumFractionDigits: [0, 20],
  minimumSignificantDigits: [1, 21],
  maximumSignificantDigits: [1, 21],
};
const numberFormatPatterns: Readonly<Record<string, RegExp>> = {
  currency: /^[A-Za-z]{3}$/u,
  unit: /^[a-z]{1,24}(?:-per-[a-z]{1,24})?$/u,
};
const numberFormatters = new Map<string, Intl.NumberFormat>();
const MAX_NUMBER_FORMATTERS = 32;

const toNumberFormatOptions = (value: unknown): Intl.NumberFormatOptions => {
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new SafeJsxError("toLocaleString options must be an object");
  }
  const options: Record<string, string | number | boolean> = {};
  for (const [key, option] of Object.entries(value)) {
    const choices = numberFormatChoices[key];
    const range = numberFormatDigitRanges[key];
    const pattern = numberFormatPatterns[key];
    if (choices && typeof option === "string" && choices.includes(option)) options[key] = option;
    else if (range && Number.isInteger(option) && Number(option) >= range[0] && Number(option) <= range[1]) {
      options[key] = Number(option);
    } else if (pattern && typeof option === "string" && pattern.test(option)) options[key] = option;
    else if (key === "useGrouping" && typeof option === "boolean") options[key] = option;
    else throw new SafeJsxError(`Unsupported toLocaleString option '${key}'`);
  }
  return options;
};

const getNumberFormatter = (locale: unknown, optionsValue: unknown) => {
  if (locale !== undefined && typeof locale !== "string")
    throw new SafeJsxError("toLocaleString locale must be a string");
  const options = toNumberFormatOptions(optionsValue);
  const key = JSON.stringify([locale ?? null, options]);
  const cached = numberFormatters.get(key);
  if (cached) {
    numberFormatters.delete(key);
    numberFormatters.set(key, cached);
    return cached;
  }
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale ?? "en-US", options);
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) throw new SafeJsxError(error.message);
    throw error;
  }
  if (numberFormatters.size >= MAX_NUMBER_FORMATTERS) {
    const oldestKey = numberFormatters.keys().next().value;
    if (oldestKey !== undefined) numberFormatters.delete(oldestKey);
  }
  numberFormatters.set(key, formatter);
  return formatter;
};

export const formatSafeNumber = (value: number, args: readonly unknown[]) => {
  if (args.length === 0) return value.toLocaleString();
  return getNumberFormatter(args[0], args[1]).format(value);
};
