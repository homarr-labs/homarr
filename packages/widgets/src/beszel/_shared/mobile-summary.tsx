"use client";

import { clientApi } from "@homarr/api/client";
import { useI18n } from "@homarr/translation/client";

import { WidgetMobileLoading, WidgetMobileSummary } from "../../common/mobile-summary";
import { useBeszelFilteredSystems } from "./hooks";
import { hasStaleIntegrationData } from "./query-status";

interface BeszelSystemsMobileSummaryProps {
  integrationIds: string[];
  label: string;
  statusFilter: string;
}

export const BeszelSystemsMobileSummary = ({
  integrationIds,
  label,
  statusFilter,
}: BeszelSystemsMobileSummaryProps) => {
  const t = useI18n();
  const {
    data: results = [],
    error,
    isPending,
    isLoadingError,
    isRefetchError,
  } = clientApi.widget.beszel.getSystems.useQuery({ integrationIds });
  const systems = useBeszelFilteredSystems(results, statusFilter);
  const failedResults = results.filter((result) => "error" in result);

  if (isPending) return <WidgetMobileLoading />;
  if (isLoadingError) throw error;
  if (results.length > 0 && failedResults.length === results.length) {
    throw new Error(String(failedResults[0]?.error ?? "Unable to connect to Beszel"));
  }

  const up = systems.filter((system) => system.status === "up").length;

  return (
    <WidgetMobileSummary
      value={systems.length}
      label={label}
      description={t("board.mobile.systemStatus", {
        up,
        attention: systems.length - up,
      })}
      isStale={hasStaleIntegrationData(isRefetchError, failedResults)}
    />
  );
};
