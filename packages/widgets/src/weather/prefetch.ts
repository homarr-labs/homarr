import { api, trpc } from "@homarr/api/server";
import { createLogger } from "@homarr/core/infrastructure/logs";

import type { Prefetch } from "../definition";

const logger = createLogger({ module: "weatherWidgetPrefetch" });

const prefetchWeatherAsync: Prefetch<"weather"> = async (queryClient, items) => {
  const locations = items.map((item) => ({
    latitude: item.options.location.latitude,
    longitude: item.options.location.longitude,
  }));

  const uniqueLocations = locations.filter(
    (loc, idx, arr) =>
      arr.findIndex((other) => other.latitude === loc.latitude && other.longitude === loc.longitude) === idx,
  );

  await Promise.all(
    uniqueLocations.map(async (input) => {
      const data = await api.widget.weather.atLocation(input);
      queryClient.setQueryData(trpc.widget.weather.atLocation.queryKey(input), data);
    }),
  );

  logger.info("Successfully prefetched weather data", { count: uniqueLocations.length });
};

export default prefetchWeatherAsync;
