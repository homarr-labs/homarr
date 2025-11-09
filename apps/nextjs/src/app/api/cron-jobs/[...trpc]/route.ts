import type { NextRequest } from "next/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { JobRouter } from "@homarr/cron-job-api";
import { jobRouter } from "@homarr/cron-job-api";
import { CRON_JOB_API_KEY_HEADER } from "@homarr/cron-job-api/constants";
import { jobGroup } from "@homarr/cron-jobs";
import { db } from "@homarr/db";
import { logger } from "@homarr/log";

import { JobManager } from "../../../../../tasks/src/job-manager";

const handler = async (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/cron-jobs",
    req,
    router: jobRouter,
    createContext: () => ({
      manager: new JobManager(db, jobGroup),
      apiKey: req.headers.get(CRON_JOB_API_KEY_HEADER) || undefined,
    }),
    onError({ path, error }) {
      logger.error(new Error(`Error in cron jobs tRPC handler path="${path}"`, { cause: error }));
    },
  });
};

export const GET = handler;
export const POST = handler;
