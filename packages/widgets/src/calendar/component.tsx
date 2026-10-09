"use client";

import { useEffect, useMemo, useState } from "react";
import { useMantineTheme } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";
import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientApi } from "@homarr/api/client";
import { useBoardReplay } from "@homarr/api/board-replay";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useCurrentIntlLocale } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { useLocalWidgetState } from "../common/use-local-widget-state";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import type { CalendarEventWithSource } from "./calendar-event-list";
import { CalendarDisplay } from "./calendar-display";
import { isCalendarView } from "./calendar-view";
import type { CalendarView } from "./calendar-view";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const queryClient = useQueryClient();
  const isReplay = useBoardReplay();
  useQuery({ queryKey: ["board-debug-calendar", props.itemId], queryFn: skipToken });
  const [month, setMonth] = useState(() => {
    if (isReplay) {
      const local = queryClient.getQueryData<{ month: number; year: number }>(["board-debug-calendar", props.itemId]);
      if (local) return new Date(local.year, local.month, 1);
      const captured = queryClient
        .getQueryCache()
        .findAll({ queryKey: [["widget", "calendar", "findAllEvents"]] })
        .map(
          (query) =>
            (
              query.queryKey[1] as {
                input?: {
                  integrationIds: string[];
                  month: number;
                  year: number;
                  releaseType: string[];
                  showUnmonitored: boolean;
                };
              }
            )?.input,
        )
        .find(
          (input) =>
            input?.integrationIds.join() === props.integrationIds.join() &&
            input.releaseType.join() === props.options.releaseType.join() &&
            input.showUnmonitored === props.options.showUnmonitored,
        );
      if (captured) return new Date(captured.year, captured.month - 1, 1);
    }
    return new Date();
  });
  useEffect(() => {
    if (!isReplay && props.itemId)
      queryClient.setQueryData(["board-debug-calendar", props.itemId], {
        month: month.getMonth(),
        year: month.getFullYear(),
      });
  }, [isReplay, month, props.itemId, queryClient]);
  const runtimeInput = {
    integrationIds: props.integrationIds,
    month: month.getMonth() + 1,
    year: month.getFullYear(),
    releaseType: props.options.releaseType,
    showUnmonitored: props.options.showUnmonitored,
  };
  useWidgetRuntimeQueries(
    props.widgetRuntimeRef,
    props.integrationIds.length > 0
      ? [getQueryKey(clientApi.widget.calendar.findAllEvents, runtimeInput, "query")]
      : [],
  );

  if (props.integrationIds.length === 0) {
    return (
      <CalendarBase
        {...props}
        events={[]}
        failedIntegrations={[]}
        isPending={false}
        month={month}
        setMonth={setMonth}
      />
    );
  }

  return <FetchCalendar month={month} setMonth={setMonth} {...props} />;
}

interface FetchCalendarProps extends WidgetComponentProps<"calendar"> {
  month: Date;
  setMonth: (date: Date) => void;
}

const FetchCalendar = ({ month, setMonth, ...props }: FetchCalendarProps) => {
  const { integrationIds, options } = props;
  const input = {
    integrationIds,
    month: month.getMonth() + 1,
    year: month.getFullYear(),
    releaseType: options.releaseType,
    showUnmonitored: options.showUnmonitored,
  };
  const calendarQuery = clientApi.widget.calendar.findAllEvents.useQuery(input);
  const data = getUsableWidgetQueryData(calendarQuery);
  const { isPending } = calendarQuery;

  const events = useMemo(
    () =>
      data?.flatMap(({ events: integrationEvents, integration, error }) =>
        error
          ? []
          : integrationEvents.map(
              (event): CalendarEventWithSource => ({
                ...event,
                source: { integrationId: integration.id, integrationName: integration.name },
              }),
            ),
      ) ?? [],
    [data],
  );
  const failedIntegrations =
    data?.flatMap(({ integration, error }) =>
      error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
    ) ?? [];

  return (
    <CalendarBase
      {...props}
      events={events}
      failedIntegrations={failedIntegrations}
      isPending={isPending}
      month={month}
      setMonth={setMonth}
    />
  );
};

interface CalendarBaseProps extends WidgetComponentProps<"calendar"> {
  events: CalendarEventWithSource[];
  failedIntegrations: { integrationId: string; integrationName: string; error: string }[];
  isPending: boolean;
  month: Date;
  setMonth: (date: Date) => void;
}

const CalendarBase = ({ options, displayMode, boardId, itemId, ...props }: CalendarBaseProps) => {
  const locale = useCurrentIntlLocale();
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const theme = useMantineTheme();
  let defaultView: CalendarView = options.defaultView;
  if (displayMode === "advanced") defaultView = "agenda";
  let storageKey: string | undefined;
  if (itemId) storageKey = `calendar-view:${boardId}:${itemId}:${displayMode ?? "normal"}:${defaultView}`;
  const [view, setView] = useLocalWidgetState<CalendarView>({
    key: storageKey,
    version: 1,
    defaultValue: defaultView,
    validate: isCalendarView,
  });

  return (
    <CalendarDisplay
      {...props}
      releaseType={options.releaseType}
      view={view}
      setView={setView}
      locale={locale}
      firstDayOfWeek={firstDayOfWeek}
      radius={theme.radius[board.itemRadius]}
    />
  );
};
