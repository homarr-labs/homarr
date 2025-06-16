import { EVERY_5_SECONDS, EVERY_30_SECONDS, EVERY_MINUTE, EVERY_HOUR } from "@homarr/cron-jobs-core/expressions";
import {
  firewallVersionRequestHandler,
  firewallCpuRequestHandler,
  firewallInterfacesRequestHandler,
  firewallMemoryRequestHandler
} from "@homarr/request-handler/firewall";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";

import { createCronJob } from "../../lib";

export const firewallCpuJob = createCronJob("firewall", EVERY_5_SECONDS).withCallback(
  createRequestIntegrationJobHandler(firewallCpuRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);

export const firewallMemoryJob = createCronJob("firewall", EVERY_MINUTE).withCallback(
  createRequestIntegrationJobHandler(firewallMemoryRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);

export const firewallInterfacesJob = createCronJob("firewall", EVERY_30_SECONDS).withCallback(
  createRequestIntegrationJobHandler(firewallInterfacesRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);

export const firewallVersionJob = createCronJob("firewall", EVERY_HOUR).withCallback(
  createRequestIntegrationJobHandler(firewallVersionRequestHandler.handler, {
    widgetKinds: ["firewall"],
    getInput: {
      firewall: () => ({}),
    },
  }),
);