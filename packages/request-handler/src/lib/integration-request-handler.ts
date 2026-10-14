import { createKeyedFingerprint } from "@homarr/common/server";
import { invalidateIntegrationResponseCacheAsync } from "@homarr/redis";

import { createIntegrationRequestRuntime } from "./integration-request-runtime";
import { createIntegrationSharedCacheAsync, createWidgetSharedCacheAsync } from "./shared-cache";

const runtime = createIntegrationRequestRuntime({
  createKeyedFingerprint,
  invalidateIntegrationResponseCacheAsync,
  sharedCache: { createIntegrationSharedCacheAsync, createWidgetSharedCacheAsync },
});

export const { createIntegrationRequestHandler, getIntegrationCacheIdentity } = runtime;
