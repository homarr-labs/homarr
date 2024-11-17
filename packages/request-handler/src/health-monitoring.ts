import dayjs from "dayjs";

import { integrationCreator } from "@homarr/integrations";
import type { HealthMonitoring } from "@homarr/integrations/types";

import { createCachedRequestHandler } from "./lib/cached-request-handler";

export const systemInfoRequestHandler = createCachedRequestHandler<
  HealthMonitoring,
  "openmediavault",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreator(integration);
    return await integrationInstance.getSystemInfoAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "systemInfo",
});
