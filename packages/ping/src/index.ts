import { fetch } from "undici";

import { extractErrorMessage } from "@homarr/common";
import { LoggingAgent } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

const logger = createLogger({ module: "ping" });

export const sendPingRequestAsync = async (url: string) => {
  try {
    const controller = new AbortController();

    // 10 seconds timeout:
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const start = performance.now();

    return await fetch(url, {
      dispatcher: new LoggingAgent({
        connect: {
          rejectUnauthorized: false, // Ping should always work, even with untrusted certificates
        },
      }),
      signal: controller.signal,
    })
      .finally(() => {
        clearTimeout(timeoutId);
      })
      .then((response) => {
        const end = performance.now();
        const durationMs = end - start;
        return { statusCode: response.status, durationMs };
      });
  } catch (error) {
    logger.error(new ErrorWithMetadata("Failed to send ping request", { url }, { cause: error }));
    return {
      error: extractErrorMessage(error),
    };
  }
};
