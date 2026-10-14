import dayjs from "dayjs";
import type { ConfigType } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import {
  defaultByteUnitSystem,
  formatBitRate,
  formatByteRate,
  formatBytes,
  formatBytesPair,
  formatNumber,
  metricToImperial,
} from "@homarr/common/number";
import type { ByteUnitSystem, FormatBitRateOptions } from "@homarr/common/number";

import {
  formatLocalizedCompactNumber,
  formatLocalizedDate,
  formatLocalizedDateTime,
  formatLocalizedTime,
} from "./date";
import type { LocalizedDateValue, LocalizedTimeOptions } from "./date";
import type { RequestCulture } from "./resources";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export interface CulturePreferences {
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  byteUnitSystem: ByteUnitSystem;
}

export const resolveCulturePreferences = (user: Partial<CulturePreferences> | null): CulturePreferences => ({
  byteUnitSystem: user?.byteUnitSystem ?? defaultByteUnitSystem,
  firstDayOfWeek: user?.firstDayOfWeek ?? 1,
});

export interface CultureClock {
  now(): number;
}

export function createCultureFormatter(culture: RequestCulture, preferences: CulturePreferences, clock: CultureClock) {
  const locale = culture.resolved.intlLocale;
  const capturedPreferences = Object.freeze({ ...preferences });
  const localizedDayjs = (value: Exclude<ConfigType, undefined>, timeZone?: string) => {
    const instance = dayjs(value).locale(culture.dayjsLocale);
    return timeZone === undefined ? instance : instance.tz(timeZone);
  };
  return {
    preferences: capturedPreferences,
    dayjs: localizedDayjs,
    formatDate: (value: LocalizedDateValue, options: Intl.DateTimeFormatOptions, fallback?: string) =>
      formatLocalizedDate(value, locale, options, fallback),
    formatTime: (value: LocalizedDateValue, options: LocalizedTimeOptions = {}, fallback?: string) =>
      formatLocalizedTime(value, locale, options, fallback),
    formatDateTime: (value: LocalizedDateValue, options: LocalizedTimeOptions = {}, fallback?: string) =>
      formatLocalizedDateTime(value, locale, options, fallback),
    formatCompactNumber: (value: number) => formatLocalizedCompactNumber(value, locale),
    formatNumber: (value: number, options: Intl.NumberFormatOptions = {}) =>
      new Intl.NumberFormat(locale, options).format(value),
    formatBytes: (bytes: number) => formatBytes(bytes, { unit: capturedPreferences.byteUnitSystem }),
    formatBytesPair: (used: number, total: number) =>
      formatBytesPair(used, total, { unit: capturedPreferences.byteUnitSystem }),
    formatByteRate: (bytes: number) => formatByteRate(bytes, { unit: capturedPreferences.byteUnitSystem }),
    formatBitRate: (bits: number, options?: FormatBitRateOptions) => formatBitRate(bits, options),
    timeAgo: (timestamp: Date) => localizedDayjs(clock.now()).to(timestamp),
    fromNow: (timestamp: Date, withoutSuffix?: boolean) => localizedDayjs(timestamp).from(clock.now(), withoutSuffix),
    toNow: (timestamp: Date, withoutSuffix?: boolean) => localizedDayjs(timestamp).to(clock.now(), withoutSuffix),
  };
}

export {
  formatNumber as formatSiNumber,
  formatBytes,
  formatBytesPair,
  formatByteRate,
  formatBitRate,
  metricToImperial,
};
