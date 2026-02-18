import dayjs from "dayjs";
import { z } from "zod";

import { decryptSecret } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";

import { createCachedWidgetRequestHandler } from "./lib/cached-widget-request-handler";

export const fetchCustomApiRequestHandler = createCachedWidgetRequestHandler({
  queryKey: "fetchCustomApiResult",
  widgetKind: "customApi",
  async requestAsync(input: { url: string; method: string; headers: string[] }) {
    const headers: Record<string, string> = {};

    for (const header of input.headers) {
      const colonIndex = header.indexOf(":");
      if (colonIndex !== -1) {
        const name = header.slice(0, colonIndex).trim();
        const encryptedValue = header.slice(colonIndex + 1).trim() as `${string}.${string}`;
        const value = decryptSecret(encryptedValue);
        if (name) headers[name] = value;
      }
    }

    const response = await withTimeoutAsync(async () => {
      return await fetchWithTrustedCertificatesAsync(input.url, {
        method: input.method,
        headers,
      });
    });
    return responseSchema.parse(await response.json()) as object;
  },
  cacheDuration: dayjs.duration(5, "minutes"),
});

const responseSchema = z.unknown();
