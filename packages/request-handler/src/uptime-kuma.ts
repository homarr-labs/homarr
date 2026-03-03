import dayjs from "dayjs";

import { createIntegrationAsync } from "@homarr/integrations";
import type { UptimeKumaCheck } from "@homarr/integrations/types";

import { createCachedIntegrationRequestHandler } from "./lib/cached-integration-request-handler";

export const uptimeKumaChecksRequestHandler = createCachedIntegrationRequestHandler<
  UptimeKumaCheck[],
  "uptimeKuma" | "mock",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = await createIntegrationAsync(integration as any);
    // cast any because our type parameter expansion can't infer new kind yet
    return await (integrationInstance as unknown as { listChecksAsync: () => Promise<UptimeKumaCheck[]> }).listChecksAsync();
  },
  cacheDuration: dayjs.duration(1, "minutes"),
  queryKey: "uptimeKumaChecks",
});
