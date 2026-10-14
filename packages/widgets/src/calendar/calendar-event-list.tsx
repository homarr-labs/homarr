import { useMantineColorScheme } from "@mantine/core";

import { isNullOrWhitespace } from "@homarr/common";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { formatLocalizedTime } from "../common/locale";
import { CalendarEventListView } from "./native-view-event-list";
import type { CalendarEventListViewProps } from "./native-view-event-list";

export type { CalendarEventWithSource } from "./native-view-event-list";

export function CalendarEventList(
  props: Pick<CalendarEventListViewProps, "events" | "advanced" | "fillHeight" | "groupByDate"> & { locale?: string },
) {
  const currentLocale = useCurrentIntlLocale();
  const { colorScheme } = useMantineColorScheme();
  const t = useI18n("widget.calendar");
  return (
    <CalendarEventListView
      {...props}
      locale={props.locale ?? currentLocale}
      colorScheme={colorScheme}
      t={t}
      bindings={{ isNullOrWhitespace, formatLocalizedTime, getSafeApplicationUrl, SAFE_NEW_TAB_REL }}
    />
  );
}
