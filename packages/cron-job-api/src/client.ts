import { createTRPCClient, httpLink } from "@trpc/client";

import type { JobRouter } from ".";
import { CRON_JOB_API_KEY_HEADER, CRON_JOB_API_PATH, CRON_JOB_API_PORT } from "./constants";
import { env } from "./env";

export const cronJobApi = createTRPCClient<JobRouter>({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/cron-jobs`,
      headers: {
        [CRON_JOB_API_KEY_HEADER]: env.CRON_JOB_API_KEY,
      },
    }),
  ],
});

function getBaseUrl() {
  // Use same-origin URL when running in consolidated mode
  // The cron jobs API is now integrated into Next.js at /api/cron-jobs
  if (typeof window !== "undefined") {
    // Client-side: use relative URL
    return "";
  }
  // Server-side: use localhost:3000 (Next.js server) since we're consolidated
  // PORT environment variable should be set, default to 3000
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}
