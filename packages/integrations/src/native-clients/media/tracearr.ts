import { z } from "zod/v4";

import { ResponseError } from "@homarr/common/response-error";

import type { TestingResult } from "../../base/test-connection/test-connection-service";
import { tracearrHealthResponseSchema } from "../../tracearr/tracearr-types";
import type {
  TracearrDashboardData,
  TracearrHealthResponse,
  TracearrHistoryResponse,
  TracearrStatsResponse,
  TracearrStreamsResponse,
  TracearrViolationsResponse,
} from "../../tracearr/tracearr-types";
import { MediaClientHoldError, MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

const statsSchema = z
  .object({
    activeStreams: z.number(),
    totalUsers: z.number(),
    totalSessions: z.number(),
    recentViolations: z.number(),
    timestamp: z.string(),
  })
  .passthrough() satisfies z.ZodType<TracearrStatsResponse>;

export class TracearrMediaClient extends MediaHttpClient implements MediaPublic<"tracearr"> {
  protected testingAsync(http: MediaHttpOperation): Promise<TestingResult> {
    return http.responseAsync(this.url("/api/v1/public/health"), { headers: this.headers() }, async (response) => {
      if (!response.ok) throw new ResponseError(response);
      return { success: true };
    });
  }

  async getHealthAsync(): Promise<TracearrHealthResponse> {
    return this.runAsync((http) =>
      http.responseAsync(this.url("/api/v1/public/health"), { headers: this.headers() }, async (response) => {
        if (!response.ok) throw new ResponseError(response);
        return tracearrHealthResponseSchema.parse(await response.json());
      }),
    );
  }

  async getStatsAsync(serverId?: string): Promise<TracearrStatsResponse> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v1/public/stats", { serverId }),
        { headers: this.headers() },
        async (response) => {
          if (!response.ok) throw new ResponseError(response);
          return statsSchema.parse(await response.json());
        },
      ),
    );
  }

  async getStreamsAsync(_serverId?: string): Promise<TracearrStreamsResponse> {
    throw new MediaClientHoldError("image-registration");
  }

  async getViolationsAsync(_pageSize = 5): Promise<TracearrViolationsResponse> {
    throw new MediaClientHoldError("image-registration");
  }

  async getHistoryAsync(_pageSize = 10): Promise<TracearrHistoryResponse> {
    throw new MediaClientHoldError("image-registration");
  }

  async getDashboardDataAsync(): Promise<TracearrDashboardData> {
    throw new MediaClientHoldError("image-registration");
  }

  private headers() {
    return { Authorization: `Bearer ${this.secret("apiKey")}` };
  }
}
