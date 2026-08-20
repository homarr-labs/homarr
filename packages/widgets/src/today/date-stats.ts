import dayjs from "dayjs";
import dayOfYear from "dayjs/plugin/dayOfYear";
import quarterOfYear from "dayjs/plugin/quarterOfYear";

dayjs.extend(dayOfYear);
dayjs.extend(quarterOfYear);

export type WeekConvention = "locale" | "iso";

export interface TodayStats {
  dayOfYear: number;
  daysInYear: number;
  daysAfterToday: number;
  monthIndex: number;
  quarter: number;
  weekNumber: number;
  weekProgress: number;
  monthProgress: number;
  yearProgress: number;
}

const getProgress = (value: number, start: number, end: number) => {
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, ((value - start) / (end - start)) * 100));
};

export const getTodayStats = (date: Date, weekConvention: WeekConvention, locale = "en-US"): TodayStats => {
  const value = dayjs(date);
  const yearStart = value.startOf("year");
  const nextYearStart = yearStart.add(1, "year");
  const monthStart = value.startOf("month");
  const nextMonthStart = monthStart.add(1, "month");
  const weekRules = getWeekRules(weekConvention, locale);
  const weekDay = value.day() === 0 ? 7 : value.day();
  const daysSinceWeekStart = (weekDay - weekRules.firstDay + 7) % 7;
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceWeekStart);
  const nextWeekStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const currentDayOfYear = value.dayOfYear();
  const daysInYear = yearStart.endOf("year").dayOfYear();

  return {
    dayOfYear: currentDayOfYear,
    daysInYear,
    daysAfterToday: daysInYear - currentDayOfYear,
    monthIndex: value.month(),
    quarter: value.quarter(),
    weekNumber: getWeekNumber(date, weekRules),
    weekProgress: getProgress(value.valueOf(), weekStart.getTime(), nextWeekStart.getTime()),
    monthProgress: getProgress(value.valueOf(), monthStart.valueOf(), nextMonthStart.valueOf()),
    yearProgress: getProgress(value.valueOf(), yearStart.valueOf(), nextYearStart.valueOf()),
  };
};

interface WeekRules {
  firstDay: number;
  minimalDays: number;
}

interface LocaleWeekInfo {
  firstDay: number;
  minimalDays?: number;
}

type LocaleWithWeekInfo = Intl.Locale & {
  weekInfo?: LocaleWeekInfo;
  getWeekInfo?: () => LocaleWeekInfo;
};

const fourDayMinimumRegions = new Set([
  "AD",
  "AN",
  "AT",
  "AX",
  "BE",
  "BG",
  "CH",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FJ",
  "FO",
  "FR",
  "GF",
  "GB",
  "GG",
  "GI",
  "GP",
  "GR",
  "IE",
  "IM",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "MC",
  "MQ",
  "NL",
  "NO",
  "PL",
  "PT",
  "RE",
  "RU",
  "SE",
  "SJ",
  "SK",
  "VA",
]);

const getWeekRules = (convention: WeekConvention, locale: string): WeekRules => {
  if (convention === "iso") return { firstDay: 1, minimalDays: 4 };
  try {
    const localeInfo = new Intl.Locale(locale) as LocaleWithWeekInfo;
    const weekInfo = localeInfo.weekInfo ?? localeInfo.getWeekInfo?.();
    if (weekInfo) {
      const region = localeInfo.maximize().region;
      const fallbackMinimalDays = region && fourDayMinimumRegions.has(region) ? 4 : 1;
      return { firstDay: weekInfo.firstDay, minimalDays: weekInfo.minimalDays ?? fallbackMinimalDays };
    }
  } catch {
    // Invalid locales fall back to the common US week convention.
  }
  return { firstDay: 7, minimalDays: 1 };
};

const getWeekNumber = (date: Date, rules: WeekRules): number => {
  const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  let weekYear = date.getFullYear();
  let firstWeekStart = getFirstWeekStart(weekYear, rules);

  if (dateDay < firstWeekStart) {
    weekYear -= 1;
    firstWeekStart = getFirstWeekStart(weekYear, rules);
  } else {
    const nextFirstWeekStart = getFirstWeekStart(weekYear + 1, rules);
    if (dateDay >= nextFirstWeekStart) return 1;
  }

  return Math.floor((dateDay - firstWeekStart) / (7 * 86_400_000)) + 1;
};

const getFirstWeekStart = (year: number, rules: WeekRules): number => {
  const januaryFirst = Date.UTC(year, 0, 1);
  const sundayBasedWeekDay = new Date(januaryFirst).getUTCDay();
  const weekDay = sundayBasedWeekDay === 0 ? 7 : sundayBasedWeekDay;
  const daysBeforeJanuary = (weekDay - rules.firstDay + 7) % 7;
  const daysInFirstWeek = 7 - daysBeforeJanuary;
  if (daysInFirstWeek >= rules.minimalDays) return januaryFirst - daysBeforeJanuary * 86_400_000;
  return januaryFirst + daysInFirstWeek * 86_400_000;
};

export interface TodayLayout {
  tiny: boolean;
  showFullDate: boolean;
  showStats: boolean;
  showQuarter: boolean;
  showMonthProgress: boolean;
}

export const getTodayLayout = (width: number, height: number): TodayLayout => {
  const tiny = width < 150 || height < 96;
  return {
    tiny,
    showFullDate: !tiny && width >= 180,
    showStats: !tiny && width >= 210 && height >= 115,
    showQuarter: width >= 240 && height >= 145,
    showMonthProgress: width >= 300 && height >= 170,
  };
};
