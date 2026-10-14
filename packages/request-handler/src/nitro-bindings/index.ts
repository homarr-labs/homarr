import { createAirQualityRequest } from "./air-quality";
import { createOwnedRequestFactories } from "./factories";
import { createIntegrationWidgetRequests } from "./integration-requests";
import type { WidgetRequestPrimitives } from "./primitive-contract";
import { createPublicWidgetRequests } from "./public-requests";
import { createReleasesRequest } from "./releases";
import type { WidgetBindingResources } from "./resources";
import { createWidgetStatisticsRuntime } from "./statistics";
import type { WidgetStatisticsProviders } from "./statistics";
import { createTimetableRequests } from "./timetable";
import { createWeatherRequest } from "./weather";

export { createWidgetHttpTransport } from "./http";
export type { WidgetHttpTransportResources } from "./http";
export { getCalendarMonthRange, mediaRequestListInputSchema, toSafeEntityDetails } from "./integration-requests";
export type { MediaRequestListInput } from "./integration-requests";
export type { WidgetRequestPrimitives } from "./primitive-contract";
export type {
  WidgetBindingLog,
  WidgetBindingResources,
  WidgetHttpResources,
  WidgetProviderResources,
} from "./resources";
export type { WidgetStatisticsProviders } from "./statistics";

export const createWidgetRequestBindings = (resources: WidgetBindingResources) => {
  const factories = createOwnedRequestFactories(resources);
  const requests = {
    ...createIntegrationWidgetRequests(factories, resources),
    ...createPublicWidgetRequests(factories, resources.http, resources.log),
    ...createTimetableRequests(factories, resources.http),
    airQuality: createAirQualityRequest(factories, resources.http),
    weather: createWeatherRequest(factories, resources.http),
    releases: createReleasesRequest(factories, resources.http, resources.log),
  } satisfies WidgetRequestPrimitives;
  let statistics: ReturnType<typeof createWidgetStatisticsRuntime> | undefined;
  let stopping: Promise<void> | undefined;
  return {
    requests,
    createStatisticsRuntime: (providers: WidgetStatisticsProviders) => {
      if (stopping) throw new Error("Widget request bindings are stopped");
      if (statistics) throw new Error("Widget statistics bindings are already initialized");
      const service = createWidgetStatisticsRuntime(factories, resources, providers);
      statistics = service;
      return service;
    },
    stopAsync: () => {
      stopping ??= (async () => {
        const settled = await Promise.allSettled([
          factories.stopAsync(),
          ...(statistics ? [statistics.stopAsync()] : []),
        ]);
        const errors = settled.flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
        if (errors.length > 0) throw new AggregateError(errors, "Widget binding shutdown failed");
      })();
      return stopping;
    },
  };
};

export type WidgetRequestBindings = ReturnType<typeof createWidgetRequestBindings>;
