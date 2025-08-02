import { DnsCacheManager } from "dns-caching";
import { setGlobalDispatcher } from "undici";

import { LoggingAgent } from "@homarr/common/server";
import { logger } from "@homarr/log";

const dnsCacheManager = new DnsCacheManager({
  cacheMaxEntries: 1000,
  forceMinTtl: 5 * 60 * 1000, // 5 minutes
  logger,
});

// Overrides the global dns lookup
dnsCacheManager.initialize();

const agent = new LoggingAgent();
setGlobalDispatcher(agent);
