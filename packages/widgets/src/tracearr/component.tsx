"use client";

import { clientApi } from "@homarr/api/client";
import { formatDuration } from "@homarr/common";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { NoIntegrationDataError } from "../errors/no-data-integration";
import { formatTotalTracearrBitrate } from "./bitrate";
import { TracearrView } from "./native-view";

export { getTracearrSectionVisibility, getAdvancedColumnWidth } from "./native-view";

export default function TracearrWidget({
  options,
  integrationIds,
  width,
  displayMode = "compact",
}: WidgetComponentProps<"tracearr">) {
  if (integrationIds.length === 0) throw new NoIntegrationDataError();
  return <TracearrContent integrationIds={integrationIds} options={options} width={width} displayMode={displayMode} />;
}

function TracearrContent({
  integrationIds,
  options,
  width,
  displayMode,
}: Pick<WidgetComponentProps<"tracearr">, "integrationIds" | "options" | "width"> & {
  displayMode: "compact" | "advanced";
}) {
  const t = useI18n("widget.tracearr");
  const locale = useCurrentIntlLocale();
  const dashboardQuery = clientApi.widget.tracearr.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery) ?? [];
  return (
    <TracearrView
      dashboardData={dashboardData}
      options={options}
      width={width}
      displayMode={displayMode}
      t={t}
      locale={locale}
      formatDuration={formatDuration}
      formatTotalTracearrBitrate={formatTotalTracearrBitrate}
      queryIndicators={<IntegrationErrorIndicator results={dashboardData} />}
    />
  );
}
