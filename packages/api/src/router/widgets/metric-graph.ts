import { z } from "zod/v4";

import { getStatsMetrics } from "@homarr/integrations/stats";
import type { SmartHomeHistoryPoint } from "@homarr/integrations/types";
import { smartHomeHistoryRequestHandler, smartHomeSnapshotRequestHandler } from "@homarr/request-handler/smart-home";
import { getStatsSeriesAsync, getStatsSnapshotAsync, refreshStatsAsync } from "@homarr/request-handler/stats";
import { widgetRefreshIntervalSchema } from "@homarr/validation/widget-refresh-interval";

import { createOneWidgetIntegrationMiddleware } from "../../middlewares/integration";
import { createTRPCRouter, publicProcedure } from "../../trpc";

const MIN_REFRESH_SECONDS = 5;
const REFRESH_WAIT_MS = 3_000;

const entityIdSchema = z
  .string()
  .max(255)
  .regex(/^[a-z0-9_]+\.[a-z0-9_]+$/);

const windowSchema = {
  minutes: z.number().int().min(5).max(1440).default(60),
  samples: z.number().int().min(2).max(120).default(60),
};

const getWindow = (minutes: number) => {
  const end = Date.now();
  return { start: end - minutes * 60_000, end };
};

const waitAtMostAsync = async (promise: Promise<unknown>, ms: number) => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    promise.catch(() => undefined),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, ms);
    }),
  ]);
  if (timeout) clearTimeout(timeout);
};

const toNumber = (state: string) => {
  if (state.trim().length === 0) return null;
  const value = Number(state);
  return Number.isFinite(value) ? value : null;
};

export const metricGraphRouter = createTRPCRouter({
  statsSeries: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "metricGraph"))
    .input(
      z.object({
        metrics: z.array(z.string().min(1).max(128)).min(1).max(4),
        refreshInterval: widgetRefreshIntervalSchema.default(30),
        ...windowSchema,
      }),
    )
    .query(async ({ ctx: { integration }, input }) => {
      const maxAgeMs = Math.max(MIN_REFRESH_SECONDS, input.refreshInterval) * 1000;
      // Refresh in the background and only wait briefly, so a slow service cannot stall the poll.
      // The next poll picks up values that arrive later.
      await waitAtMostAsync(refreshStatsAsync(integration, { maxAgeMs }), REFRESH_WAIT_MS);

      const metrics = getStatsMetrics(integration.kind);
      const snapshot = await getStatsSnapshotAsync(integration);
      const series = await getStatsSeriesAsync(integration, {
        metrics: input.metrics,
        ...getWindow(input.minutes),
        samples: input.samples,
      });

      return {
        series: series.map(({ metric, points }) => {
          const definition = metrics.find((item) => item.key === metric);
          const current = snapshot.values[metric];
          return {
            key: metric,
            name: definition?.label ?? metric,
            unit: definition?.unit ?? "count",
            current: typeof current === "number" ? current : null,
            points,
          };
        }),
        updatedAt: snapshot.updatedAt,
        error: snapshot.error,
      };
    }),
  smartHomeSeries: publicProcedure
    .concat(createOneWidgetIntegrationMiddleware("query", "smartHome-entityState"))
    .input(z.object({ entityIds: z.array(entityIdSchema).min(1).max(4), ...windowSchema }))
    .query(async ({ ctx: { integration }, input }) => {
      const entityIds = input.entityIds.toSorted();
      const { start, end } = getWindow(input.minutes);
      // Native history is requested in whole hours; scale samples so the visible window keeps its resolution.
      const hours = Math.ceil(input.minutes / 60);
      const samples = Math.min(200, Math.max(2, Math.round((input.samples * hours * 60) / input.minutes)));

      const [history, snapshot] = await Promise.all([
        smartHomeHistoryRequestHandler
          .handler(integration, { entityIds, hours, samples })
          .getDataAsync()
          .then(({ data }) => data)
          .catch(() => []),
        smartHomeSnapshotRequestHandler
          .handler(integration, { entityIds, areaIds: [], domains: [] })
          .getDataAsync()
          .then(({ data }) => data),
      ]);

      return {
        series: input.entityIds.map((entityId) => {
          const entity = snapshot.entities.find((item) => item.id === entityId);
          const current = entity ? toNumber(entity.state) : null;
          const points: SmartHomeHistoryPoint[] = (
            history.find((item) => item.entityId === entityId)?.points ?? []
          ).filter((point) => point.time >= start);
          // History is cached for minutes; the live state keeps the line moving at the refresh interval.
          if (current !== null) points.push({ time: end, value: current });
          return {
            key: entityId,
            name: entity?.name ?? entityId,
            unit: entity?.unit ?? null,
            current,
            points,
          };
        }),
        updatedAt: snapshot.updatedAt,
        error: false,
      };
    }),
});
