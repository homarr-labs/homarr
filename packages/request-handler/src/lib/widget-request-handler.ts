import { invalidateWidgetCache } from "@homarr/redis";

import { createWidgetRequestRuntime } from "./widget-request-runtime";
import { createIntegrationSharedCacheAsync, createWidgetSharedCacheAsync } from "./shared-cache";

const runtime = createWidgetRequestRuntime({
  invalidateWidgetCache,
  sharedCache: { createIntegrationSharedCacheAsync, createWidgetSharedCacheAsync },
});

export const { createWidgetRequestHandler } = runtime;
