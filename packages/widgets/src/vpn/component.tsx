"use client";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { VpnView } from "./native-view";
import { VpnIntegrationCard } from "./vpn-card";

export default function VpnWidget({ options, integrationIds, width, height }: WidgetComponentProps<"vpn">) {
  const summariesQuery = clientApi.widget.vpn.getSummaries.useQuery({ ...options, integrationIds });
  const integrations = getUsableWidgetQueryData(summariesQuery) ?? [];
  const dense = width < 240 || height < 120;
  return (
    <VpnView
      width={width}
      height={height}
      isPending={summariesQuery.isPending}
      integrations={integrations.map((result) => ({
        integration: result.integration,
        error: result.error,
        card: (
          <VpnIntegrationCard
            vpn={result.summary}
            integrationName={result.integration.name}
            variant={integrations.length === 1 && width >= 240 ? "single" : "list"}
            dense={dense}
          />
        ),
      }))}
    />
  );
}
