import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const fetchCustomApiRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "fetchCustomApiResult",
  widgetKind: "customApi",
  async requestAsync(input: { url: string; method: string; headerName: string; headerValue: string }) {
    const headers: Record<string, string> = {};
    if (input.headerName && input.headerValue) {
      headers[input.headerName] = input.headerValue;
    }

    const response = await fetchWithTimeout(input.url, {
      method: input.method,
      headers,
    });
    return responseSchema.parse(await response.json()) as object;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

const responseSchema = z.unknown();
