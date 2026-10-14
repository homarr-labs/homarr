import { Center } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { DynamicSelectOption } from "../_inputs/widget-dynamic-select-input";
import { formatLocalizedTime } from "../common/locale";
import type { WidgetComponentProps } from "../definition";
import { TimetableNativeView } from "./native-view";

export default function TimetableWidget({
  options,
  displayMode = "compact",
  width,
  height,
  itemId,
}: WidgetComponentProps<"timetable">) {
  const t = useI18n("widget.timetable");
  if (!options.station) return <Center h="100%">{t("noStation")}</Center>;
  return (
    <TimetableWidgetInner
      station={options.station}
      baseUrl={options.baseUrl}
      itemId={itemId}
      displayMode={displayMode}
      width={width}
      height={height}
    />
  );
}

interface TimetableWidgetInnerProps {
  station: DynamicSelectOption;
  baseUrl: string;
  itemId?: string;
  displayMode: "compact" | "advanced";
  width: number;
  height: number;
}

const TimetableWidgetInner = ({ station, baseUrl, itemId, displayMode, width, height }: TimetableWidgetInnerProps) => {
  const {
    data: timetable,
    error,
    isPending,
  } = clientApi.widget.timetable.getTimetable.useQuery({
    baseUrl,
    itemId,
    stationId: station.value,
    limit: displayMode === "advanced" ? 50 : 10,
  });
  const t = useI18n("widget.timetable");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();
  if (error && timetable === undefined) throw error;
  const entries = timetable?.entries ?? [];
  const staleTime = timetable ? formatLocalizedTime(timetable.timestamp, locale, { includeSeconds: true }) : undefined;
  const staleWarning = error && staleTime ? t("warning.stale", { time: staleTime }) : undefined;
  const compactStaleWarning = error && staleTime ? t("warning.staleCompact") : undefined;

  return (
    <TimetableNativeView
      title={t("title", { station: station.label })}
      loadingLabel={tCommon("action.loading")}
      entries={entries}
      isPending={isPending}
      staleWarning={staleWarning}
      compactStaleWarning={compactStaleWarning}
      timestamp={staleTime}
      locale={locale}
      displayMode={displayMode}
      width={width}
      height={height}
    />
  );
};
