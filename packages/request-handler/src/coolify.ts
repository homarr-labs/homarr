import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { CoolifyInstanceInfo } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const coolifyRequestHandler = createCachedIntegrationRequestHandler<
  CoolifyInstanceInfo,
  "coolify",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getInstanceInfoAsync();
  },
  cacheDuration: dayjs.duration(30, "seconds"),
  queryKey: "coolifyInfo",
});
