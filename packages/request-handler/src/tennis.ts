import { env as commonEnv } from "@homarr/common/env";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { withTimeoutAsync } from "@homarr/core/infrastructure/http/timeout";

import { env } from "./env";
import { createWidgetRequestHandler } from "./lib/widget-request-handler";
import { parseTennisResponse } from "./tennis-mapping";

const BASE_URL = "https://api.livetennisapi.com/api/public/v1";

/**
 * Thrown when no API key is configured or the configured key was rejected.
 * The widget router translates this into an UNAUTHORIZED tRPC error so the
 * widget can render a dedicated "configure your API key" message.
 */
export class TennisApiKeyError extends Error {}

export const fetchTennisMatchesHandler = createWidgetRequestHandler({
  async requestAsync(input: { tour: string; status: string; matchCount: number }) {
    if (commonEnv.NO_EXTERNAL_CONNECTION) {
      return { matches: [] };
    }

    const apiKey = env.LIVE_TENNIS_API_KEY;
    if (!apiKey) {
      throw new TennisApiKeyError("LIVE_TENNIS_API_KEY is not configured");
    }

    const url = new URL(`${BASE_URL}/matches`);
    url.searchParams.set("status", input.status);
    url.searchParams.set("limit", String(input.matchCount));
    if (input.tour !== "all") {
      url.searchParams.set("tour", input.tour);
    }

    const response = await withTimeoutAsync(async (signal) => {
      return await fetchWithTrustedCertificatesAsync(url.toString(), {
        signal,
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      });
    });

    if (response.status === 401 || response.status === 403) {
      throw new TennisApiKeyError(`Live Tennis API rejected the configured API key (${response.status})`);
    }

    if (!response.ok) {
      throw new Error(`Live Tennis API responded with ${response.status}`);
    }

    return parseTennisResponse(await response.json());
  },
});
