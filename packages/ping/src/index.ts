import { extractErrorMessage } from "@homarr/common";
import { logger } from "@homarr/log";

export const sendPingRequestAsync = async (url: string) => {
  try {
    return await fetch(url).then((response) => ({ statusCode: response.status }));
  } catch (error) {
    logger.error("packages/ping/src/index.ts:", error);
    return {
      error: extractErrorMessage(error),
    };
  }
};
