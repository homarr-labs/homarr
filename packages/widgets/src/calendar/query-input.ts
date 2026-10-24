import type { RouterInputs } from "@homarr/api";

type CalendarInput = RouterInputs["widget"]["calendar"]["findAllEvents"];

export const getCalendarQueryInput = (
  integrationIds: string[],
  options: Pick<CalendarInput, "releaseType" | "showUnmonitored">,
  month: Date,
): CalendarInput => ({
  integrationIds,
  month: month.getMonth() + 1,
  year: month.getFullYear(),
  releaseType: options.releaseType,
  showUnmonitored: options.showUnmonitored,
});

export const getUnambiguousCalendarMonth = () => {
  const now = Date.now();
  const earliest = new Date(now - 14 * 60 * 60 * 1000);
  const latest = new Date(now + 14 * 60 * 60 * 1000);
  if (earliest.getUTCMonth() !== latest.getUTCMonth() || earliest.getUTCFullYear() !== latest.getUTCFullYear())
    return null;
  return new Date(now);
};
