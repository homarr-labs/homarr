// Date arithmetic for the heatmap, ported from Thingport's profile page. Works on YYYY-MM-DD strings
// in UTC so no time zone or DST shift can move a day; "today" comes from the viewer's own zone.

const DAY_MS = 86_400_000;

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);
const pad = (value: number) => String(value).padStart(2, "0");

export const addDays = (iso: string, days: number) => toIso(new Date(toDate(iso).getTime() + days * DAY_MS));

/** The viewer's date, in their own time zone. */
export const localToday = (now: Date) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export interface DateRange {
  from: string;
  to: string;
}

/** The year up to and including today. */
export function lastYearRange(today: string): DateRange {
  const [year = 0, month = 1, day = 1] = today.split("-").map(Number);
  return { from: addDays(toIso(new Date(Date.UTC(year - 1, month - 1, day))), 1), to: today };
}

export const yearRange = (year: number): DateRange => ({ from: `${year}-01-01`, to: `${year}-12-31` });

export interface Cell {
  date: string;
  inRange: boolean;
}

/**
 * The range as columns of 7 days, the first column starting on `weekStart` (0 = Sunday). The first
 * and last weeks are filled out with the days around the range, marked out of range.
 */
export function buildWeeks(range: DateRange, weekStart: 0 | 1): Cell[][] {
  const lead = (toDate(range.from).getUTCDay() - weekStart + 7) % 7;
  const weeks: Cell[][] = [];
  let date = addDays(range.from, -lead);
  while (date <= range.to) {
    const week: Cell[] = [];
    for (let index = 0; index < 7; index++) {
      week.push({ date, inRange: date >= range.from && date <= range.to });
      date = addDays(date, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// A label needs this many columns before the next one (or the edge), as on GitHub; a month that
// barely starts in the range goes unlabelled rather than overlapping.
const MIN_LABEL_COLUMNS = 3;

/** Where each month's label goes: the first week holding a day of it, by column index. */
export function monthStarts(weeks: Cell[][]): { column: number; month: number }[] {
  const starts: { column: number; month: number }[] = [];
  weeks.forEach((week, column) => {
    const first = week.find((cell) => cell.inRange);
    if (!first) return;
    const month = toDate(first.date).getUTCMonth();
    if (starts.at(-1)?.month !== month) starts.push({ column, month });
  });
  return starts.filter(
    (start, index) => (starts[index + 1]?.column ?? weeks.length) - start.column >= MIN_LABEL_COLUMNS,
  );
}

/** 0 for no activity, then 1-4 by share of the busiest day, as GitHub shades its graph. */
export function level(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.ceil((count / max) * 4)) as 1 | 2 | 3 | 4;
}
