import { cache } from "react";
import { headers } from "next/headers";

import { readCaptureViewId } from "@homarr/cron-jobs/board-preparation";

export const getCapturedViewIdAsync = cache(async () => readCaptureViewId(await headers()));
