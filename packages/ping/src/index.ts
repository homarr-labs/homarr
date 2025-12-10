import { fetch } from "undici";

import { extractErrorMessage } from "@homarr/common";
import { LoggingAgent } from "@homarr/common/server";
import { logger } from "@homarr/log";

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
    logger.error(new Error(`Failed to send ping request to "${url}"`, { cause: error }));
    return {
      error: extractErrorMessage(error),
    };
  }
};
