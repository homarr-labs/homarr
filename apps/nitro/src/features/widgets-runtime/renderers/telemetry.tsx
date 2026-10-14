import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { IntegrationErrorIndicator, NativeSpeedtestTrackerView } from "@homarr/widgets/common/native-read-rendering";
import type { NativeSpeedtestTrackerViewProps } from "@homarr/widgets/common/native-read-rendering";

import { useSpeedtestQuery } from "../generated-hooks";
import { getUsableNativeWidgetData } from "../query-state";

export type SpeedtestRendererPresentation = Pick<NativeSpeedtestTrackerViewProps, "itemRadius">;

export function createNativeSpeedtestRenderer(presentation: SpeedtestRendererPresentation) {
  return function NativeSpeedtestRenderer({
    options,
    integrationIds,
    width,
  }: WidgetComponentProps<"speedtestTracker">) {
    const query = useSpeedtestQuery({ integrationIds });
    const dashboardData = getUsableNativeWidgetData(query) ?? [];
    return (
      <NativeSpeedtestTrackerView
        options={options}
        width={width}
        dashboardData={dashboardData}
        itemRadius={presentation.itemRadius}
        queryIndicators={<IntegrationErrorIndicator results={dashboardData} />}
      />
    );
  };
}
