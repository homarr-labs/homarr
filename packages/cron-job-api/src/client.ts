import { createTRPCClient, httpLink } from "@trpc/client";

import type { JobRouter } from ".";
import { CRON_JOB_API_KEY_HEADER, CRON_JOB_API_PATH, CRON_JOB_API_PORT } from "./constants";
import { env } from "./env";

export const cronJobApi = createTRPCClient<JobRouter>({
  links: [
    httpLink({
      url: `${getBaseUrl()}${CRON_JOB_API_PATH}`,
      headers: {
        [CRON_JOB_API_KEY_HEADER]: env.CRON_JOB_API_KEY,
      },
    }),
  ],
});

function getBaseUrl() {
  // Tasks API is now merged into Next.js, so use the same port
  // In production, this will be handled by nginx proxy
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}
