export type LocalizedDateValue = Date | number | string;

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

interface LocalizedTimeOptions {
  hour12?: boolean;
  includeSeconds?: boolean;
  timeZone?: string;
}

const toValidDate = (value: LocalizedDateValue): Date | undefined => {
  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === "string" && dateOnlyPattern.test(value) ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const formatLocalizedDate = (
  value: LocalizedDateValue,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  fallback = "?",
): string => {
  const date = toValidDate(value);
  if (!date) return fallback;

  const normalizedOptions =
    typeof value === "string" && dateOnlyPattern.test(value) && options.timeZone === undefined
      ? { ...options, timeZone: "UTC" }
      : options;
  return new Intl.DateTimeFormat(locale, normalizedOptions).format(date);
};

export const formatLocalizedTime = (
  value: LocalizedDateValue,
  locale: string,
  { hour12, includeSeconds = false, timeZone }: LocalizedTimeOptions = {},
  fallback = "?",
): string =>
  formatLocalizedDate(
    value,
    locale,
    {
      hour: "numeric",
      minute: "2-digit",
      second: includeSeconds ? "2-digit" : undefined,
      hour12,
      timeZone,
    },
    fallback,
  );

export const formatLocalizedDateTime = (
  value: LocalizedDateValue,
  locale: string,
  options: Pick<LocalizedTimeOptions, "hour12" | "timeZone"> = {},
  fallback = "?",
): string =>
  formatLocalizedDate(
    value,
    locale,
    { dateStyle: "medium", timeStyle: "short", hour12: options.hour12, timeZone: options.timeZone },
    fallback,
  );

export const formatLocalizedCompactNumber = (value: number, locale: string): string =>
  new Intl.NumberFormat(locale, { notation: "compact" }).format(value);

export type BinaryStatusKey = "enabled" | "disabled" | "unknown";

export const getBinaryStatusKey = (status?: "enabled" | "disabled"): BinaryStatusKey => status ?? "unknown";
