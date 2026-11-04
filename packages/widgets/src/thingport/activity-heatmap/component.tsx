"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Group, Select, Text, Tooltip } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { thingportActivityKinds } from "@homarr/integrations/types";
import type { ThingportActivityDay } from "@homarr/integrations/types";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../../common/application-url";
import { getUsableWidgetQueryData } from "../../common/query-state";
import { WidgetQueryLoadingState } from "../../common/query-state-indicator";
import { useWidgetNow } from "../../common/use-widget-now";
import type { WidgetComponentProps } from "../../definition";
import { useWidgetRuntimeQueries } from "../../runtime-hooks";
import { getRenderedSize } from "../common/rendered-size";
import { canShowThingportHeader, ThingportWidgetHeader } from "../common/widget-header";
import { buildWeeks, lastYearRange, level, localToday, monthStarts, yearRange } from "./calendar";
import classes from "./component.module.css";

const PADDING = 8;
const SECTION_GAP = 6;
// Fits the xs year picker.
const HEADER_HEIGHT = 30;
const MONTH_ROW_HEIGHT = 14 + 4;
const LEGEND_HEIGHT = 14;
const WEEKDAY_COLUMN_WIDTH = 26 + 6;
const MIN_CELL = 9;
const MAX_CELL = 18;
const LAST_YEAR = "last";

const gapFor = (cell: number) => (cell >= 14 ? 4 : 3);

const dayTotal = (counts: ThingportActivityDay["counts"]) =>
  Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);

/** GitHub's contribution graph, as on the Thingport profile page: a column per week, darker the busier the day. */
export default function ThingportActivityHeatmapWidget({
  integrationIds,
  options,
  widgetRuntimeRef,
  ...sizeProps
}: WidgetComponentProps<"thingport-activityHeatmap">) {
  // Laid out in the widget's own (logical) pixels; only the cell size limits and the weekday cut-off are meant on
  // screen, so they are converted with the board's zoom.
  const { width, height } = sizeProps;
  const rendered = getRenderedSize(sizeProps);
  const { scale } = rendered;
  const t = useI18n("widget.thingport-activityHeatmap");
  const locale = useCurrentIntlLocale();
  const now = useWidgetNow("day");
  const today = now ? localToday(now) : null;
  // Null is the last 12 months; a year is that calendar year.
  const [year, setYear] = useState<number | null>(null);
  const range = useMemo(() => (year !== null ? yearRange(year) : today ? lastYearRange(today) : null), [year, today]);
  const input = {
    integrationId: integrationIds[0] ?? "",
    from: range?.from ?? "",
    to: range?.to ?? "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const query = clientApi.widget.thingport.getActivity.useQuery(input, {
    enabled: range !== null,
    placeholderData: (previous) => previous,
  });
  const activity = getUsableWidgetQueryData(query);
  useWidgetRuntimeQueries(widgetRuntimeRef, [getQueryKey(clientApi.widget.thingport.getActivity, input, "query")]);

  const weekStart = options.weekStart === "monday" ? 1 : 0;
  const allWeeks = useMemo(() => (range ? buildWeeks(range, weekStart) : []), [range, weekStart]);
  const byDate = useMemo(() => new Map((activity?.days ?? []).map((day) => [day.date, day.counts])), [activity?.days]);
  const max = useMemo(
    () => Math.max(0, ...(activity?.days ?? []).map((day) => dayTotal(day.counts))),
    [activity?.days],
  );
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  if (!range || !today) return <WidgetQueryLoadingState />;

  const showLogo = options.showTitle && canShowThingportHeader(rendered.width, rendered.height);
  const showHeader = showLogo || options.showTotal || (activity?.years.length ?? 0) > 1;
  const availableHeight =
    height -
    PADDING * 2 -
    (showHeader ? HEADER_HEIGHT + SECTION_GAP : 0) -
    (options.showLegend ? LEGEND_HEIGHT + SECTION_GAP : 0) -
    MONTH_ROW_HEIGHT;
  const showWeekdays = rendered.width >= 240;
  const availableWidth = width - PADDING * 2 - (showWeekdays ? WEEKDAY_COLUMN_WIDTH : 0);

  // Square cells sized to the height; when every week can't fit across, the oldest are dropped, as GitHub
  // does on a narrow screen.
  // The gap grows with the cell on screen, so size for the larger gap and the cells never overrun the height.
  const minCell = MIN_CELL / scale;
  const maxCell = MAX_CELL / scale;
  const cellByHeight = (availableHeight - 6 * (4 / scale)) / 7;
  const cellAcrossAllWeeks = (availableWidth + 3 / scale) / allWeeks.length - 3 / scale;
  const cell = Math.max(
    6 / scale,
    Math.min(maxCell, cellByHeight, cellAcrossAllWeeks >= minCell ? cellAcrossAllWeeks : maxCell),
  );
  const gap = gapFor(cell * scale) / scale;
  const visibleCount = Math.max(1, Math.min(allWeeks.length, Math.floor((availableWidth + gap) / (cell + gap))));
  const weeks = allWeeks.slice(-visibleCount);
  const months = monthStarts(weeks);

  const monthName = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const weekdayName = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const longDate = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
  // Every other row is labelled, as on GitHub. 4 January 2026 was a Sunday.
  const rowLabel = (row: number) =>
    row % 2 === 1 ? weekdayName.format(new Date(Date.UTC(2026, 0, 4 + ((row + weekStart) % 7)))) : "";

  const profileUrl = getSafeApplicationUrl(activity?.profileUrl);
  const years = activity?.years ?? [];
  const totalLabel = activity
    ? year === null
      ? t("totalLastYear", { count: activity.total })
      : t("totalInYear", { count: activity.total, year })
    : "";

  const totalLink = (
    <a href={profileUrl} target="_blank" rel={SAFE_NEW_TAB_REL} className={classes.total}>
      {totalLabel}
    </a>
  );

  return (
    <div className={classes.root} style={{ "--cell": `${cell}px`, "--gap": `${gap}px` } as CSSProperties}>
      {showHeader && (
        <div className={classes.header}>
          {showLogo ? (
            <ThingportWidgetHeader title={options.showTotal ? totalLink : t("title")} />
          ) : options.showTotal ? (
            totalLink
          ) : (
            <span />
          )}
          {years.length > 1 && (
            <Select
              size="xs"
              w={130}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
              value={year === null ? LAST_YEAR : String(year)}
              onChange={(value) => {
                const next = value === null || value === LAST_YEAR ? null : Number(value);
                // This year is the default view, the last 12 months, as on Thingport.
                setYear(next === now?.getFullYear() ? null : next);
              }}
              data={[
                { value: LAST_YEAR, label: t("lastYear") },
                ...years
                  .filter((option) => option !== now?.getFullYear())
                  .map((option) => ({ value: String(option), label: String(option) })),
              ]}
            />
          )}
        </div>
      )}

      <div className={classes.body}>
        <div className={classes.calendar} style={{ gridTemplateColumns: showWeekdays ? "auto auto" : "auto" }}>
          {showWeekdays ? <div /> : null}
          <div className={classes.months} style={{ width: weeks.length * (cell + gap) - gap }}>
            {months.map(({ column, month }) => (
              <span key={`${column}-${month}`} className={classes.month} style={{ left: column * (cell + gap) }}>
                {monthName.format(new Date(Date.UTC(2026, month, 1)))}
              </span>
            ))}
          </div>
          {showWeekdays ? (
            <div className={classes.weekdays}>
              {Array.from({ length: 7 }, (_, row) => (
                <span key={row} className={classes.weekday}>
                  {rowLabel(row)}
                </span>
              ))}
            </div>
          ) : null}
          {/* One tooltip for the whole grid, fed by whichever day is under the pointer. */}
          <Tooltip.Floating
            disabled={!hoveredDate}
            label={
              hoveredDate ? (
                <DayTooltip date={hoveredDate} counts={byDate.get(hoveredDate) ?? {}} format={longDate} />
              ) : null
            }
          >
            <div
              className={classes.grid}
              onPointerOver={(event) => {
                const date = (event.target as HTMLElement).dataset.date ?? null;
                if (date !== hoveredDate) setHoveredDate(date);
              }}
              onPointerLeave={() => setHoveredDate(null)}
            >
              {weeks.flat().map(({ date, inRange }) => {
                if (!inRange) return <span key={date} />;
                const total = dayTotal(byDate.get(date) ?? {});
                return (
                  <span
                    key={date}
                    data-date={date}
                    data-level={level(total, max)}
                    data-future={date > today ? true : undefined}
                    className={classes.cell}
                  />
                );
              })}
            </div>
          </Tooltip.Floating>
        </div>
      </div>

      {options.showLegend && (
        <div className={classes.legend}>
          <span className={classes.legendLabel}>{t("less")}</span>
          {[0, 1, 2, 3, 4].map((value) => (
            <span key={value} data-level={value} className={classes.cell} />
          ))}
          <span className={classes.legendLabel}>{t("more")}</span>
        </div>
      )}
    </div>
  );
}

interface DayTooltipProps {
  date: string;
  counts: ThingportActivityDay["counts"];
  format: Intl.DateTimeFormat;
}

function DayTooltip({ date, counts, format }: DayTooltipProps) {
  const t = useI18n("widget.thingport-activityHeatmap");
  const total = dayTotal(counts);
  const label = format.format(new Date(`${date}T00:00:00Z`));

  return (
    <div>
      <Text size="xs" fw={700}>
        {total ? t("dayTotal", { count: total, date: label }) : t("dayEmpty", { date: label })}
      </Text>
      {thingportActivityKinds
        .filter((kind) => counts[kind])
        .map((kind) => (
          <Group key={kind} justify="space-between" gap="md" wrap="nowrap">
            <Text size="xs">{t(`kinds.${kind}`)}</Text>
            <Text size="xs" fw={600}>
              {counts[kind]}
            </Text>
          </Group>
        ))}
    </div>
  );
}
