import { cache } from "react";
import { headers } from "next/headers";

import { readCaptureViewId } from "@homarr/cron-jobs/board-preparation";

/** The Prepared Board view this render is captured for, if any. */
export const getCapturedViewIdAsync = cache(async () => readCaptureViewId(await headers()));
