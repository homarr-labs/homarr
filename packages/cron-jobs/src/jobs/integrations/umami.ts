import { EVERY_5_MINUTES } from "@homarr/cron-jobs-core/expressions";
import { createRequestIntegrationJobHandler } from "@homarr/request-handler/lib/cached-request-integration-job-handler";
import {
  umamiMultiEventRequestHandler,
  umamiRequestHandler,
  umamiTopPagesRequestHandler,
  umamiTopReferrersRequestHandler,
} from "@homarr/request-handler/umami";

import { createCronJob } from "../../lib";

export const umamiJob = createCronJob("umami", EVERY_5_MINUTES).withCallback(
  createRequestIntegrationJobHandler(umamiRequestHandler.handler, {
    widgetKinds: ["umami"],
    getInput: {
      umami: (options) => ({
        websiteId: options.websiteId,
        timeFrame: options.timeFrame,
        eventName: options.eventName || undefined,
      }),
    },
  }),
);

export const umamiTopPagesJob = createCronJob("umamiTopPages", EVERY_5_MINUTES).withCallback(
  createRequestIntegrationJobHandler(umamiTopPagesRequestHandler.handler, {
    widgetKinds: ["umami"],
    getInput: {
      umami: (options) => {
        if (options.viewMode !== "topPages" || !options.websiteId) return [];
        return { websiteId: options.websiteId, timeFrame: options.timeFrame, limit: options.topCount };
      },
    },
  }),
);

export const umamiTopReferrersJob = createCronJob("umamiTopReferrers", EVERY_5_MINUTES).withCallback(
  createRequestIntegrationJobHandler(umamiTopReferrersRequestHandler.handler, {
    widgetKinds: ["umami"],
    getInput: {
      umami: (options) => {
        if (options.viewMode !== "topReferrers" || !options.websiteId) return [];
        return { websiteId: options.websiteId, timeFrame: options.timeFrame, limit: options.topCount };
      },
    },
  }),
);

export const umamiMultiEventJob = createCronJob("umamiMultiEvent", EVERY_5_MINUTES).withCallback(
  createRequestIntegrationJobHandler(umamiMultiEventRequestHandler.handler, {
    widgetKinds: ["umami"],
    getInput: {
      umami: (options) => {
        if (options.viewMode !== "events" || !options.websiteId || !options.eventNames.length) return [];
        return {
          websiteId: options.websiteId,
          timeFrame: options.timeFrame,
          eventNames: [...options.eventNames].sort(),
        };
      },
    },
  }),
);
