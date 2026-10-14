"use client";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";

import type { WidgetComponentProps } from "../definition";
import { IntegrationErrorIndicator } from "../common/integration-error-indicator";
import { getUsableWidgetQueryData } from "../common/query-state";
import { NativeSpeedtestTrackerView } from "./native-view";

const emptyDashboardData = [] as const;

export default function SpeedtestTrackerWidget({
  options,
  integrationIds,
  width,
}: WidgetComponentProps<"speedtestTracker">) {
  const board = useRequiredBoard();
  const dashboardQuery = clientApi.widget.speedtestTracker.getDashboard.useQuery({ integrationIds });
  const dashboardData = getUsableWidgetQueryData(dashboardQuery) ?? emptyDashboardData;

  return (
    <NativeSpeedtestTrackerView
      options={options}
      width={width}
      dashboardData={dashboardData}
      itemRadius={board.itemRadius}
      queryIndicators={<IntegrationErrorIndicator results={dashboardData} />}
    />
  );
}
