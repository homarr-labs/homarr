"use client";

import { useMantineTheme } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { getStockSummary, StockPriceNativeView } from "./native-view";

export { getStockLayout, getStockSummary } from "./native-view";
export type { StockLayout, StockSummary } from "./native-view";

export default function StockPriceWidget({
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
  const stockQuery = clientApi.widget.stockPrice.getPriceHistory.useQuery(options);
  const result = getUsableWidgetQueryData(stockQuery);
  if (isInitialWidgetQueryPending(stockQuery)) return <WidgetQueryLoadingState />;
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
