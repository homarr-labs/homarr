"use client";

import { useMemo, useState } from "react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useSettings } from "@homarr/settings";
import { useCurrentIntlLocale } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import type { CalendarEventWithSource } from "./calendar-event-list";
import { CalendarDisplay } from "./calendar-display";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(() => new Date());
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

const CalendarBase = ({ options, displayMode, ...props }: CalendarBaseProps) => {
  const locale = useCurrentIntlLocale();
  const { firstDayOfWeek } = useSettings();

  return (
    <CalendarDisplay
      {...props}
      releaseType={options.releaseType}
      view={displayMode === "advanced" ? "agenda" : options.viewMode}
      hideHeader={displayMode !== "advanced" && options.hideHeader}
      locale={locale}
      firstDayOfWeek={firstDayOfWeek}
    />
  );
};
