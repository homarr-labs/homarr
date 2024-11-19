import dayjs from "dayjs";

import { integrationCreator } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const dnsHoleRequestHandler = createCachedIntegrationRequestHandler<
  DnsHoleSummary,
  "piHole" | "adGuardHome",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreator(integration);
    return await integrationInstance.getSummaryAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "dnsHoleSummary",
});
