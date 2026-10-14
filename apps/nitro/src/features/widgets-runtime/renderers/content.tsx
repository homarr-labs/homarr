import { Center, Flex, Text, useMantineTheme } from "@mantine/core";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets/definition";
import {
  formatLocalizedTime,
  getStockSummary,
  MinecraftServerStatusNativeView,
  StockPriceNativeView,
  TimetableNativeView,
  WidgetEmptyState,
  WidgetQueryLoadingState,
} from "@homarr/widgets/common/native-read-rendering";
import type { MinecraftServerStatusNativeViewProps } from "@homarr/widgets/common/native-read-rendering";

import { useMinecraftQuery, useStockPriceQuery, useTimetableQuery } from "../generated-hooks";
import { getUsableNativeWidgetData } from "../query-state";

export function NativeStockPriceRenderer({
  options,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"stockPrice">) {
  const t = useI18n("widget.stockPrice");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();
  const theme = useMantineTheme();
  const query = useStockPriceQuery(options);
  const result = getUsableNativeWidgetData(query);
  if (query.isPending && query.data === undefined && !query.error) return <WidgetQueryLoadingState />;
  if (!result) return <WidgetEmptyState />;
  const { data } = result;
  const summary = getStockSummary(data.priceHistory, data.previousClose);
  if (!summary) return <WidgetEmptyState />;
  return (
    <StockPriceNativeView
      data={data}
      summary={summary}
      showDetails={options.showDetails}
      width={width}
      height={height}
      displayMode={displayMode}
      displayScale={displayScale}
      locale={locale}
      trendColors={{ green: theme.colors.green[7], red: theme.colors.red[7], gray: theme.colors.gray[6] }}
      labels={{
        timeRange: t("option.timeRange.label"),
        timeRangeValue: t(`option.timeRange.option.${options.timeRange}.label`),
        timeInterval: t("option.timeInterval.label"),
        timeIntervalValue: t(`option.timeInterval.option.${options.timeInterval}.label`),
        currentPrice: t("advanced.currentPrice"),
        previousClose: t("advanced.previousClose"),
        change: tCommon("action.change"),
        changePercentage: t("advanced.changePercentage"),
        minimum: t("advanced.minimum"),
        maximum: t("advanced.maximum"),
      }}
    />
  );
}

export function NativeTimetableRenderer(props: WidgetComponentProps<"timetable">) {
  const t = useI18n("widget.timetable");
  const station = props.options.station;
  if (!station) return <Center h="100%">{t("noStation")}</Center>;
  return <TimetableContent {...props} station={station} />;
}

type TimetableContentProps = WidgetComponentProps<"timetable"> & {
  station: NonNullable<WidgetComponentProps<"timetable">["options"]["station"]>;
};

function TimetableContent({ station, options, itemId, displayMode = "compact", width, height }: TimetableContentProps) {
  let limit = 10;
  if (displayMode === "advanced") limit = 50;
  const {
    data: timetable,
    error,
    isPending,
  } = useTimetableQuery({
    baseUrl: options.baseUrl,
    itemId,
    stationId: station.value,
    limit,
  });
  const t = useI18n("widget.timetable");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();
  if (error && timetable === undefined) throw error;
  let staleTime: string | undefined;
  let staleWarning: string | undefined;
  let compactStaleWarning: string | undefined;
  if (timetable) staleTime = formatLocalizedTime(timetable.timestamp, locale, { includeSeconds: true });
  if (error && staleTime) {
    staleWarning = t("warning.stale", { time: staleTime });
    compactStaleWarning = t("warning.staleCompact");
  }
  return (
    <TimetableNativeView
      title={t("title", { station: station.label })}
      loadingLabel={tCommon("action.loading")}
      entries={timetable?.entries ?? []}
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
}

export type MinecraftRendererPresentation = Pick<MinecraftServerStatusNativeViewProps, "zoomCompensatedSize">;

export function createNativeMinecraftRenderer(presentation: MinecraftRendererPresentation) {
  return function NativeMinecraftRenderer({
    options,
    width,
    height,
    displayMode,
  }: WidgetComponentProps<"minecraftServerStatus">) {
    const { data: result, isPending, error } = useMinecraftQuery(options);
    const t = useI18n("widget.minecraftServerStatus");
    const tCommon = useI18n("common");
    if (isPending) {
      return (
        <Flex align="center" justify="center" h="100%">
          <Text c="dimmed" size="sm">
            {tCommon("action.loading")}
          </Text>
        </Flex>
      );
    }
    if (error && !result) throw error;
    if (!result) return <WidgetEmptyState />;
    return (
      <MinecraftServerStatusNativeView
        data={result.data}
        options={options}
        width={width}
        height={height}
        displayMode={displayMode}
        labels={{
          online: t("status.online"),
          offline: t("status.offline"),
          bedrock: t("option.isBedrockServer.label"),
        }}
        zoomCompensatedSize={presentation.zoomCompensatedSize}
      />
    );
  };
}
