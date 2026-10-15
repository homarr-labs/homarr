import { setTimeout } from "node:timers/promises";

import { getPreparationOrigin, requestBoardPreparationAsync } from "../board-preparation-request";
import { createCronJob } from "../lib";

export const boardPreparationJob = createCronJob("boardPreparation", "0 */3 * * *", {
  runOnStart: true,
  expectedMaximumDurationInMillis: 60_000,
}).withCallback(async () => {
  // Tasks start during instrumentation, before Next necessarily accepts HTTP.
  // Waiting here does not hold dashboard readiness or the application's listener.
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${getPreparationOrigin()}/api/health/live`, {
        signal: AbortSignal.timeout(1_000),
        redirect: "error",
      });
      await response.arrayBuffer();
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Retry local application readiness.
    }
    await setTimeout(1_000);
  }
  if (!ready) throw new Error("Application did not become ready for Board preparation");
  await requestBoardPreparationAsync();
});
