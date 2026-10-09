"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Menu,
  Modal,
  Text,
  Tooltip,
  UnstyledButton,
  getThemeColor,
  useMantineTheme,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useElementSize } from "@mantine/hooks";
import { DayView, WeekView } from "@mantine/schedule";
import { IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconCalendarEvent } from "@tabler/icons-react";
import dayjs from "dayjs";

import { useI18n } from "@homarr/translation/client";

// oxlint-disable-next-line import/no-unassigned-import
import "@mantine/schedule/styles.css";
import actionTargetClasses from "../common/action-target.module.css";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { formatLocalizedTime } from "../common/locale";
import { CalendarDay } from "./calender-day";
import { getCalendarAgendaEvents, groupEventsByDate, splitEvents, toCalendarDateKey } from "./calendar-events";
import { CalendarEventList } from "./calendar-event-list";
import type { CalendarEventWithSource } from "./calendar-event-list";
import { getCalendarScheduleEvents, isCalendarAllDayEvent } from "./calendar-schedule-events";
import { calendarViews } from "./calendar-view";
import type { CalendarView } from "./calendar-view";
import classes from "./component.module.css";

interface CalendarDisplayProps {
  events: CalendarEventWithSource[];
  failedIntegrations: { integrationId: string; integrationName: string; error: string }[];
  isPending: boolean;
  isEditMode: boolean;
  month: Date;
  setMonth: (date: Date) => void;
  view: CalendarView;
  setView: (view: CalendarView) => void;
  isViewChangeDisabled: boolean;
  isSavingView: boolean;
  releaseType: readonly string[];
  locale: string;
  firstDayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  radius: CSSProperties["borderRadius"];
}

export const CalendarDisplay = ({
  events,
  failedIntegrations,
  isPending,
  isEditMode,
  month: date,
  setMonth: setDate,
  view,
  setView,
  isViewChangeDisabled,
  isSavingView,
  releaseType,
  locale,
  firstDayOfWeek,
  radius,
}: CalendarDisplayProps) => {
  const t = useI18n("widget.calendar");
  const { ref, width, height } = useElementSize();
  const { ref: bodyRef, height: bodyHeight } = useElementSize();
  const [details, setDetails] = useState<CalendarEventWithSource[] | null>(null);
  useEffect(() => setDetails(null), [date, view]);
  const filteredEvents = useMemo(
    () =>
      events.filter((event) => event.metadata?.type !== "radarr" || releaseType.includes(event.metadata.releaseType)),
    [events, releaseType],
  );
  const eventsByDate = useMemo(() => groupEventsByDate(splitEvents(filteredEvents)), [filteredEvents]);
  const agendaEvents = useMemo(() => getCalendarAgendaEvents(events, date, releaseType), [events, date, releaseType]);
  const scheduleEvents = useMemo(() => getCalendarScheduleEvents(filteredEvents), [filteredEvents]);
  const labels = {
    allDay: t("duration.allDay"),
    today: t("controls.today"),
    previous: t("controls.previous"),
    next: t("controls.next"),
    noEvents: t("controls.noEvents"),
    weekday: t("controls.weekday"),
    timeSlot: t("controls.timeSlot"),
    moreLabel: (count: number) => t("controls.more", { count }),
  };
  const openEvent = (event: (typeof scheduleEvents)[number]) => {
    if (isEditMode) return;
    const original = event.payload?.event as CalendarEventWithSource | undefined;
    if (original) setDetails([original]);
  };
  const openDay = (value: string) => {
    if (isEditMode) return;
    const dayEvents = eventsByDate.get(value) as CalendarEventWithSource[] | undefined;
    if (dayEvents?.length) setDetails(dayEvents);
  };
  const moveDate = (amount: number) => {
    if (view === "day") setDate(dayjs(date).add(amount, "day").toDate());
    else if (view === "week") setDate(dayjs(date).add(amount, "week").toDate());
    else setDate(dayjs(date).add(amount, "month").toDate());
  };
  let dateLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
  if (view === "day")
    dateLabel = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(date);
  if (view === "week") {
    const start = dayjs(date).subtract((dayjs(date).day() - firstDayOfWeek + 7) % 7, "day");
    const formatter = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
    dateLabel = `${formatter.format(start.toDate())} – ${formatter.format(start.add(6, "day").toDate())}`;
  }
  const monthStart = dayjs(date).startOf("month");
  const leadingDays = (monthStart.day() - firstDayOfWeek + 7) % 7;
  const weekCount = Math.ceil((leadingDays + monthStart.daysInMonth()) / 7);
  let scheduleMode: "static" | "default" = "default";
  if (isEditMode) scheduleMode = "static";
  const scheduleProps = {
    date,
    events: scheduleEvents,
    locale,
    labels,
    withHeader: false,
    mode: scheduleMode,
    onEventClick: openEvent,
    scrollAreaProps: {
      h: bodyHeight,
      mah: bodyHeight,
      type: "auto" as const,
      styles: { content: { minWidth: 0, width: "100%" } },
      startScrollPosition: { y: 8 * Math.max(40, bodyHeight / 12) },
    },
    slotHeight: Math.max(40, bodyHeight / 12),
    allDaySlotHeight: 32,
    h: "100%",
    w: "100%",
    slotLabelFormat: (value: string) => formatLocalizedTime(dayjs(value).toDate(), locale),
  };

  return (
    <Box ref={ref} className={classes.root} h="100%" w="100%" p="xs" data-calendar-view={view}>
      <Box className={classes.header}>
        <Group className={classes.navigation} gap={2} wrap="nowrap">
          <ActionIcon
            className={actionTargetClasses.root}
            variant="subtle"
            size="sm"
            aria-label={t("controls.previous")}
            disabled={isEditMode}
            onClick={() => moveDate(-1)}
          >
            <IconChevronLeft size={16} />
          </ActionIcon>
          <Text size="sm" fw={600} tt="capitalize" truncate className={classes.dateLabel}>
            {dateLabel}
          </Text>
          <ActionIcon
            className={actionTargetClasses.root}
            variant="subtle"
            size="sm"
            aria-label={t("controls.next")}
            disabled={isEditMode}
            onClick={() => moveDate(1)}
          >
            <IconChevronRight size={16} />
          </ActionIcon>
        </Group>
        <Group className={classes.tools} gap={4} wrap="nowrap">
          <IntegrationErrorIndicator results={failedIntegrations} />
          <Tooltip label={t("controls.today")} events={{ hover: true, focus: true, touch: false }}>
            <ActionIcon
              className={actionTargetClasses.root}
              variant="subtle"
              size="sm"
              aria-label={t("controls.today")}
              disabled={isEditMode}
              onClick={() => setDate(new Date())}
            >
              <IconCalendarEvent size={16} />
            </ActionIcon>
          </Tooltip>
          <Menu withinPortal position="bottom-end" shadow="sm">
            <Menu.Target>
              <Button
                className={actionTargetClasses.root}
                variant="subtle"
                size="compact-xs"
                disabled={isEditMode || isViewChangeDisabled}
                loading={isSavingView}
                aria-label={`${t("controls.view")}: ${t(`view.${view}`)}`}
                rightSection={<IconChevronDown size={12} />}
              >
                {t(`view.${view}`)}
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {calendarViews.map((mode) => (
                <Menu.Item
                  key={mode}
                  onClick={() => setView(mode)}
                  rightSection={view === mode && <IconCheck size={14} aria-hidden />}
                >
                  {t(`view.${mode}`)}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>
      <Box ref={bodyRef} className={classes.body}>
        {isPending && (
          <Center h="100%" component="output" aria-label={t("advanced.loading")}>
            <Loader size="sm" />
          </Center>
        )}
        {!isPending && (view === "compact" || view === "month") && (
          <Calendar
            date={date}
            onDateChange={(value) => setDate(dayjs(value).toDate())}
            maxLevel="month"
            fullWidth
            highlightToday
            locale={locale}
            firstDayOfWeek={firstDayOfWeek}
            static={view === "month"}
            className={classes.calendar}
            w="100%"
            h="100%"
            getDayProps={(value) => {
              if (view === "month") return {};
              return { onClick: () => openDay(value), disabled: isEditMode };
            }}
            styles={{
              calendarHeader: { display: "none" },
              levelsGroup: { height: "100%" },
              month: { height: "100%", tableLayout: "fixed" },
              monthCell: { textAlign: "center", position: "relative", padding: 2 },
              day: {
                borderRadius: radius,
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
                aspectRatio: "auto",
                minHeight: 0,
                minWidth: 0,
                maxWidth: "100%",
                overflow: "hidden",
              },
              weekday: { padding: 0, fontSize: "var(--mantine-font-size-xs)" },
              weekdaysRow: { height: 22 },
            }}
            renderDay={(value) => {
              const tileDate = dayjs(value).toDate();
              const dayEvents = (eventsByDate.get(toCalendarDateKey(tileDate)) ?? []) as CalendarEventWithSource[];
              if (view === "month")
                return (
                  <DetailedDay
                    date={tileDate}
                    events={dayEvents}
                    locale={locale}
                    cellHeight={(bodyHeight - 22) / weekCount}
                    disabled={isEditMode}
                    onOpen={setDetails}
                  />
                );
              return (
                <CalendarDay
                  date={tileDate}
                  events={dayEvents}
                  disabled={dayEvents.length === 0 || isEditMode}
                  rootWidth={width}
                  rootHeight={height}
                />
              );
            }}
          />
        )}
        {!isPending && view === "agenda" && (
          <>
            {agendaEvents.length > 0 && (
              <CalendarEventList events={agendaEvents} advanced groupByDate locale={locale} fillHeight />
            )}
            {agendaEvents.length === 0 && (
              <Center h="100%">
                <Text size="sm" c="dimmed" ta="center">
                  {t("controls.noEvents")}
                </Text>
              </Center>
            )}
          </>
        )}
        {!isPending && view === "day" && bodyHeight > 0 && (
          <DayView
            {...scheduleProps}
            className={classes.dayView}
            style={{ "--day-view-slot-labels-width": "3.5rem" } as CSSProperties}
            styles={{ dayViewScrollArea: { height: "100%" }, dayViewSlotLabel: { fontSize: 10, whiteSpace: "nowrap" } }}
          />
        )}
        {!isPending && view === "week" && bodyHeight > 0 && (
          <WeekView
            {...scheduleProps}
            firstDayOfWeek={firstDayOfWeek}
            withWeekNumber={false}
            className={classes.weekView}
            style={
              {
                "--week-view-min-slot-width": "0px",
                "--week-view-slots-label-width": width < 350 ? "2rem" : "3.5rem",
              } as CSSProperties
            }
            styles={{
              weekViewRoot: { height: "100%" },
              weekViewScrollArea: { height: "100%" },
              weekViewDayLabel: { minWidth: 0, overflow: "hidden", fontSize: "var(--mantine-font-size-xs)" },
              weekViewDayWeekday: { fontSize: 10 },
              weekViewDayNumber: { fontSize: 10, paddingInline: 0, minWidth: 0 },
              weekViewSlotLabel: { fontSize: 10, whiteSpace: "nowrap" },
              weekViewAllDaySlotsLabel: { fontSize: 10 },
            }}
            weekdayFormat={(value) =>
              new Intl.DateTimeFormat(locale, { weekday: width < 350 ? "narrow" : "short" }).format(
                dayjs(value).toDate(),
              )
            }
            onDateChange={(value) => {
              if (!isEditMode) setDate(dayjs(value).toDate());
            }}
            onViewChange={(value) => {
              if (!isEditMode && !isViewChangeDisabled && value === "day") setView("day");
            }}
          />
        )}
      </Box>
      <Modal
        opened={details !== null}
        onClose={() => setDetails(null)}
        title={t("controls.eventDetails")}
        closeButtonProps={{ "aria-label": t("controls.close") }}
        centered
        size="lg"
      >
        {details && <CalendarEventList events={details} advanced locale={locale} />}
      </Modal>
    </Box>
  );
};

interface DetailedDayProps {
  date: Date;
  events: CalendarEventWithSource[];
  locale: string;
  cellHeight: number;
  disabled: boolean;
  onOpen: (events: CalendarEventWithSource[]) => void;
}

const DetailedDay = ({ date, events, locale, cellHeight, disabled, onOpen }: DetailedDayProps) => {
  const theme = useMantineTheme();
  const t = useI18n("widget.calendar");
  const maxRows = Math.max(0, Math.floor((cellHeight - 20) / 18));
  let visibleCount = Math.min(events.length, maxRows);
  if (events.length > maxRows) visibleCount = Math.max(0, maxRows - 1);
  const hiddenCount = events.length - visibleCount;
  return (
    <Box className={classes.detailedDay} data-compact={maxRows === 0 || undefined}>
      <UnstyledButton
        className={classes.dayNumber}
        aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)}
        disabled={disabled || events.length === 0}
        onClick={() => onOpen(events)}
      >
        {date.getDate()}
      </UnstyledButton>
      {events.slice(0, visibleCount).map((event, index) => (
        <UnstyledButton
          key={index}
          disabled={disabled}
          className={classes.monthEvent}
          onClick={() => onOpen([event])}
          style={{ "--event-color": getThemeColor(event.indicatorColor ?? "blue", theme) } as CSSProperties}
          title={event.title}
        >
          {!isCalendarAllDayEvent(event) && (
            <span className={classes.eventTime}>{formatLocalizedTime(event.startDate, locale)} </span>
          )}
          {event.title}
        </UnstyledButton>
      ))}
      {hiddenCount > 0 && (
        <UnstyledButton
          disabled={disabled}
          className={classes.moreEvents}
          aria-label={t("controls.moreLabel", { count: hiddenCount })}
          onClick={() => onOpen(events)}
        >
          +{hiddenCount}
        </UnstyledButton>
      )}
    </Box>
  );
};
