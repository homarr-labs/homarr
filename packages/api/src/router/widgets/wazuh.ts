import { z } from "zod/v4";

import { removeTrailingSlash } from "@homarr/common";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { WidgetKind } from "@homarr/definitions";
import { mockWidgetData, toWazuhPublicError } from "@homarr/integrations";
import type { WazuhPublicError } from "@homarr/integrations";
import {
  wazuhCveOrders,
  wazuhFimEvents,
  wazuhTimelineIntervals,
  wazuhTimeRanges,
  wazuhTopListKinds,
} from "@homarr/integrations/types";
import {
  getWazuhTimelineRequestHandler,
  wazuhAgentsRequestHandler,
  wazuhAlertsRequestHandler,
  wazuhAuthFailuresRequestHandler,
  wazuhFimRequestHandler,
  wazuhSummaryRequestHandler,
  wazuhTopListRequestHandler,
  wazuhVulnerabilitiesRequestHandler,
} from "@homarr/request-handler/wazuh";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createApiRouter, publicProcedure } from "../../procedure";

const logger = createLogger({ module: "wazuhRouter" });

type WazuhResult<TData> =
  | { data: TData; updatedAt: Date; error: null; dashboardUrl: string | null }
  | { data: null; updatedAt: null; error: WazuhPublicError; dashboardUrl: string | null };

interface WazuhContextIntegration {
  id: string;
  kind: string;
  url: string;
  externalUrl: string | null;
}

const getDashboardUrl = (integration: WazuhContextIntegration): string | null => {
  const candidate = integration.externalUrl;
  if (!candidate) return null;
  if (removeTrailingSlash(candidate) === removeTrailingSlash(integration.url)) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return removeTrailingSlash(url.toString());
  } catch {
    return null;
  }
};

/**
 * Wazuh widgets render friendly messages for auth, TLS and reachability problems, so upstream failures are
 * returned as a safe reason instead of a generic oRPC error.
 */
const settleAsync = async <TData>(
  operation: string,
  integration: WazuhContextIntegration,
  getDataAsync: () => Promise<{ data: TData; timestamp: Date }>,
): Promise<WazuhResult<TData>> => {
  const dashboardUrl = getDashboardUrl(integration);
  try {
    const { data, timestamp } = await getDataAsync();
    return { data, updatedAt: timestamp, error: null, dashboardUrl };
  } catch (error) {
    const publicError = toWazuhPublicError(error);
    logger.warn("Wazuh widget request failed", { operation, integrationId: integration.id, ...publicError });
    return { data: null, updatedAt: null, error: publicError, dashboardUrl };
  }
};

const mockResult = <TData>(data: TData): WazuhResult<TData> => ({
  data,
  updatedAt: new Date(mockWidgetData.timestamp),
  error: null,
  dashboardUrl: null,
});

const integrationIdHint = "REQUIRED: integrationId (single Wazuh integration ID from integration_all).";
const indexerHint = "Requires indexer credentials on the integration.";

const wazuhProcedure = (widgetKind: WidgetKind & "wazuh", description: string) =>
  publicProcedure
    .meta({ mcp: { enabled: true, description: `${description} ${integrationIdHint}` } })
    .concat(createOneWidgetIntegrationMiddleware("query", widgetKind));

const timeRange = z.enum(wazuhTimeRanges);

export const wazuhRouter = createApiRouter({
  getAgents: wazuhProcedure(
    "wazuh",
    "Get Wazuh agent counts and the full agent list (status, IP, OS, version, last keepalive, groups).",
  ).query(async ({ context }) => {
    if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhAgents);
    const integration = { ...context.integration, kind: "wazuh" as const };
    return await settleAsync("getAgents", integration, () =>
      wazuhAgentsRequestHandler.handler(integration, {}).getDataAsync(),
    );
  }),
  getAlerts: wazuhProcedure("wazuh", `Get recent Wazuh alerts at or above a rule level. ${indexerHint}`)
    .input(
      z.object({
        minLevel: z.number().int().min(0).max(16).default(7),
        limit: z.number().int().min(1).max(100).default(20),
        hours: z.number().int().min(1).max(720).default(24),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhAlerts);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getAlerts", integration, () =>
        wazuhAlertsRequestHandler
          .handler(integration, { minLevel: input.minLevel, limit: input.limit, hours: input.hours })
          .getDataAsync(),
      );
    }),
  getSummary: wazuhProcedure(
    "wazuh",
    "Get Wazuh alert counts by severity for a time range compared with the previous period, plus manager version and indexer health.",
  )
    .input(z.object({ range: timeRange.default("24h") }))
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhSummary);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getSummary", integration, () =>
        wazuhSummaryRequestHandler.handler(integration, { range: input.range }).getDataAsync(),
      );
    }),
  getTimeline: wazuhProcedure(
    "wazuh",
    `Get a histogram of Wazuh alerts over time split by severity (low, medium, high, critical). ${indexerHint}`,
  )
    .input(
      z.object({
        range: timeRange.default("24h"),
        interval: z.enum(wazuhTimelineIntervals).default("auto"),
        minLevel: z.number().int().min(0).max(16).default(0),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhTimeline);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getTimeline", integration, () =>
        getWazuhTimelineRequestHandler(input.range).handler(integration, input).getDataAsync(),
      );
    }),
  getTopList: wazuhProcedure(
    "wazuh",
    `Get the top Wazuh rules, agents, source IPs, MITRE ATT&CK tactics or techniques by alert count. ${indexerHint}`,
  )
    .input(
      z.object({
        kind: z.enum(wazuhTopListKinds).default("rules"),
        range: timeRange.default("24h"),
        limit: z.number().int().min(1).max(50).default(8),
        minLevel: z.number().int().min(0).max(16).default(0),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult({ ...mockWidgetData.wazuhTopList, kind: input.kind });
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getTopList", integration, () =>
        wazuhTopListRequestHandler.handler(integration, input).getDataAsync(),
      );
    }),
  getVulnerabilities: wazuhProcedure(
    "wazuh",
    `Get Wazuh vulnerability counts by severity, the top CVEs and the most vulnerable agents. ${indexerHint}`,
  )
    .input(
      z.object({
        cveLimit: z.number().int().min(1).max(50).default(8),
        agentLimit: z.number().int().min(1).max(50).default(5),
        cveOrder: z.enum(wazuhCveOrders).default("score"),
        minSeverity: z.enum(["all", "medium", "high", "critical"]).default("all"),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhVulnerabilities);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getVulnerabilities", integration, () =>
        wazuhVulnerabilitiesRequestHandler.handler(integration, input).getDataAsync(),
      );
    }),
  getFim: wazuhProcedure(
    "wazuh",
    `Get recent Wazuh file integrity monitoring (syscheck) events with counts per event type. ${indexerHint}`,
  )
    .input(
      z.object({
        range: timeRange.default("24h"),
        event: z.enum(wazuhFimEvents).default("all"),
        limit: z.number().int().min(1).max(100).default(20),
        includeRegistry: z.boolean().default(true),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhFim);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getFim", integration, () =>
        wazuhFimRequestHandler.handler(integration, input).getDataAsync(),
      );
    }),
  getAuthFailures: wazuhProcedure(
    "wazuh",
    `Get failed-login and brute-force alert counts per agent with hourly series and top source IPs. ${indexerHint}`,
  )
    .input(
      z.object({
        hours: z.number().int().min(1).max(720).default(24),
        limit: z.number().int().min(1).max(25).default(6),
      }),
    )
    .query(async ({ context, input }) => {
      if (context.integration.kind === "mock") return mockResult(mockWidgetData.wazuhAuthFailures);
      const integration = { ...context.integration, kind: "wazuh" as const };
      return await settleAsync("getAuthFailures", integration, () =>
        wazuhAuthFailuresRequestHandler.handler(integration, input).getDataAsync(),
      );
    }),
});
