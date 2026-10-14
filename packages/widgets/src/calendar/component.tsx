"use client";

import { useMemo, useState } from "react";
import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { isNullOrWhitespace } from "@homarr/common";
import { useSettings } from "@homarr/settings";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { formatLocalizedTime } from "../common/locale";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import type { CalendarEventWithSource } from "./calendar-event-list";
import { CalendarView } from "./native-view";
import type { CalendarViewProps } from "./native-view";

export default function CalendarWidget(props: WidgetComponentProps<"calendar">) {
  const [month, setMonth] = useState(() => new Date());
  const runtimeInput = {
    integrationIds: props.integrationIds,
    month: month.getMonth(),
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
      <CalendarProducer
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

function FetchCalendar({ month, setMonth, isEditMode, integrationIds, options, displayMode }: FetchCalendarProps) {
  const input = {
    integrationIds,
    month: month.getMonth() + 1,
    year: month.getFullYear(),
    releaseType: options.releaseType,
    showUnmonitored: options.showUnmonitored,
  };
  const calendarQuery = clientApi.widget.calendar.findAllEvents.useQuery(input);
  const data = getUsableWidgetQueryData(calendarQuery);
  const events = useMemo(
    () =>
      data?.flatMap(({ events: integrationEvents, integration, error }) =>
        error
          ? []
          : integrationEvents.map((event): CalendarEventWithSource => ({
              ...event,
              source: { integrationId: integration.id, integrationName: integration.name },
            })),
      ) ?? [],
    [data],
  );
  const failedIntegrations =
    data?.flatMap(({ integration, error }) =>
      error ? [{ integrationId: integration.id, integrationName: integration.name, error }] : [],
    ) ?? [];
  if (isInitialWidgetQueryPending(calendarQuery)) return <WidgetQueryLoadingState />;
  return (
    <CalendarProducer
      isEditMode={isEditMode}
      events={events}
      failedIntegrations={failedIntegrations}
      isPending={calendarQuery.isPending}
      month={month}
      setMonth={setMonth}
      options={options}
      displayMode={displayMode}
    />
  );
}

function CalendarProducer(
  props: Omit<
    CalendarViewProps,
    "locale" | "firstDayOfWeek" | "actualItemRadius" | "queryIndicators" | "t" | "eventListProps"
  >,
) {
  const locale = useCurrentIntlLocale();
  const { firstDayOfWeek } = useSettings();
  const board = useRequiredBoard();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const t = useI18n("widget.calendar.advanced");
  const tCalendar = useI18n("widget.calendar");
  return (
    <CalendarView
      {...props}
      locale={locale}
      firstDayOfWeek={firstDayOfWeek}
      actualItemRadius={theme.radius[board.itemRadius]}
      t={t}
      queryIndicators={<IntegrationErrorIndicator results={props.failedIntegrations} />}
      eventListProps={{
        t: tCalendar,
        colorScheme,
        bindings: { isNullOrWhitespace, formatLocalizedTime, getSafeApplicationUrl, SAFE_NEW_TAB_REL },
      }}
    />
  );
}
