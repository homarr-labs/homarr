import dayjs from "dayjs";

import { EVERY_5_SECONDS } from "@homarr/cron-jobs-core/expressions";
import { integrationCreatorFromSecrets } from "@homarr/integrations";
import type { DnsHoleSummary } from "@homarr/integrations/types";

import { createCronJob } from "../../lib";
import { createCachedRequestHandler, createIntegrationWidgetHandlerJob } from "../../lib/handler";

export const dnsHoleHandler = createCachedRequestHandler<
  DnsHoleSummary,
  "piHole" | "adGuardHome",
  Record<string, never>
>({
  async requestAsync(integration, _input) {
    const integrationInstance = integrationCreatorFromSecrets(integration);
    return await integrationInstance.getSummaryAsync();
  },
  cacheDuration: dayjs.duration(5, "seconds"),
  queryKey: "dnsHoleSummary",
});

export const dnsHoleJob = createCronJob("dnsHole", EVERY_5_SECONDS).withCallback(
  createIntegrationWidgetHandlerJob(dnsHoleHandler, {
    widgetKinds: ["dnsHoleSummary", "dnsHoleControls"],
    getInput: {
      dnsHoleSummary: () => ({}),
      dnsHoleControls: () => ({}),
    },
  }),
);
