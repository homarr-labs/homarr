import dayjs from "dayjs";
import { z } from "zod";

import { fetchWithTimeout } from "@homarr/common";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const fetchCustomApiRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "fetchCustomApiResult",
  widgetKind: "customApi",
  async requestAsync(input: { url: string; }) {
    const response = await fetchWithTimeout(input.url);
    return responseSchema.parse(await response.json()) as object;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

const responseSchema = z.any();