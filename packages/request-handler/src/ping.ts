import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { fetch } from "undici";

import { extractErrorMessage } from "@homarr/common";
import { LoggingAgent } from "@homarr/common/server";
import { logger } from "@homarr/log";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

dayjs.extend(duration);

type PingResponse =
  | {
      statusCode: number;
      durationMs: number;
    }
  | {
      error: string;
    };
export const pingRequestHandler = createCachedWidgetRequestHandler<PingResponse, "app", { url: string }>({
  queryKey: "pingResult",
  widgetKind: "app",
  async requestAsync(input) {
    return await sendPingRequestAsync(input.url);
  },
  cacheDuration: dayjs.duration(1, "minute"),
});

const sendPingRequestAsync = async (url: string) => {
  try {
    const start = performance.now();
    return await fetch(url, {
      dispatcher: new LoggingAgent({
        connect: {
          rejectUnauthorized: false,
        },
      }),
    }).then((response) => {
      const end = performance.now();
      logger.debug(`Ping request succeeded url="${url}" status="${response.status}" duration="${end - start}ms"`);
      return { statusCode: response.status, durationMs: end - start };
    });
  } catch (error) {
    logger.error(new Error(`Failed to send ping request to url="${url}"`, { cause: error }));
    return {
      error: extractErrorMessage(error),
    };
  }
};
