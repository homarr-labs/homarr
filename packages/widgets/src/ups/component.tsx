"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";
import { UpsView } from "./native-view";

export { getUpsDevices } from "./native-view";

export default function UpsWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode = "compact",
  displayScale = 1,
}: WidgetComponentProps<"ups">) {
  if (integrationIds.length === 0) throw new NoIntegrationSelectedError();
  let responsiveWidth = width;
  let responsiveHeight = height;
  if (displayMode !== "advanced") {
    responsiveWidth *= displayScale;
    responsiveHeight *= displayScale;
  }
  return (
    <UpsContent
      integrationIds={integrationIds}
      options={options}
      width={responsiveWidth}
      height={responsiveHeight}
      displayMode={displayMode}
    />
  );
}

interface UpsContentProps {
  integrationIds: string[];
  options: WidgetComponentProps<"ups">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function UpsContent({ integrationIds, options, width, height, displayMode }: UpsContentProps) {
  const summariesQuery = clientApi.widget.ups.getSummaries.useQuery({ integrationIds });
  const data = getUsableWidgetQueryData(summariesQuery);
  return <UpsView data={data} options={options} width={width} height={height} displayMode={displayMode} />;
}
