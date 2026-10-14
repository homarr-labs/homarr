"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { NoIntegrationSelectedError } from "../errors/no-integration-selected";
import { LlamacppView } from "./native-view";

export default function LlamacppWidget({
  integrationIds,
  options,
  width,
  height,
  displayMode = "compact",
}: WidgetComponentProps<"llamacpp">) {
  const integrationId = integrationIds[0];
  if (!integrationId) throw new NoIntegrationSelectedError();
  return (
    <LlamacppContent
      integrationId={integrationId}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}

interface LlamacppContentProps {
  integrationId: string;
  options: WidgetComponentProps<"llamacpp">["options"];
  width: number;
  height: number;
  displayMode: "compact" | "advanced";
}

function LlamacppContent({ integrationId, options, width, height, displayMode }: LlamacppContentProps) {
  const { data, isError } = clientApi.widget.llamacpp.getStats.useQuery({ integrationId });
  return (
    <LlamacppView
      data={data}
      isError={isError}
      options={options}
      width={width}
      height={height}
      displayMode={displayMode}
    />
  );
}
