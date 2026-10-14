"use client";

import { useMemo } from "react";
import { getQueryKey } from "@trpc/react-query";

import { clientApi } from "@homarr/api/client";
import { useByteFormatter } from "@homarr/settings";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { useWidgetRuntimeQueries } from "../runtime-hooks";
import { getBeszelAlertsQueryInput } from "./display";
import { NativeBeszelAlertsView } from "./native-view";

export default function BeszelAlertsWidget({
  options,
  integrationIds,
  isEditMode,
  displayMode,
  widgetRuntimeRef,
}: WidgetComponentProps<"beszelAlerts">) {
  const { formatByteRate } = useByteFormatter();
  const isAdvanced = displayMode === "advanced";
  const alertsInput = useMemo(
    () =>
      getBeszelAlertsQueryInput(
        integrationIds,
        { showHistory: options.showHistory, maxHistoryItems: options.maxHistoryItems },
        isAdvanced,
      ),
    [integrationIds, options.showHistory, options.maxHistoryItems, isAdvanced],
  );
  const alertsQuery = clientApi.widget.beszel.getAlerts.useQuery(alertsInput);
  const runtimeQueries = useMemo(
    () => [getQueryKey(clientApi.widget.beszel.getAlerts, alertsInput, "query")],
    [alertsInput],
  );
  useWidgetRuntimeQueries(widgetRuntimeRef, runtimeQueries);
  const resultData = getUsableWidgetQueryData(alertsQuery);
  const results = useMemo(() => resultData ?? [], [resultData]);

  return (
    <NativeBeszelAlertsView
      options={options}
      isEditMode={isEditMode}
      displayMode={displayMode}
      results={results}
      isPending={alertsQuery.isPending}
      queryIndicators={<IntegrationErrorIndicator results={results} />}
      formatByteRate={formatByteRate}
    />
  );
}
