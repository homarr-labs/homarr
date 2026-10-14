import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type {
  TdarrQueue,
  TdarrStatistics,
  TdarrWorker,
} from "../../interfaces/media-transcoding/media-transcoding-types";
import {
  getNodesResponseSchema,
  getStatisticsSchema,
  getStatusTableSchema,
} from "../../media-transcoding/tdarr-validation-schemas";
import { MediaHttpClient } from "./http";
import type { MediaHttpOperation, MediaPublic } from "./http";

export class TdarrMediaClient extends MediaHttpClient implements MediaPublic<"tdarr"> {
  protected testingAsync(http: MediaHttpOperation) {
    return http.responseAsync(
      this.url("/api/v2/is-server-alive"),
      {
        method: "POST",
        headers: { accept: "application/json", "X-Api-Key": this.hasSecret("apiKey") ? this.secret("apiKey") : "" },
      },
      async (response) => {
        if (!response.ok) return TestConnectionError.StatusResult(response);
        await response.json();
        return { success: true } as const;
      },
    );
  }

  async getStatisticsAsync(): Promise<TdarrStatistics> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v2/stats/get-pies"),
        {
          method: "POST",
          headers: { ...this.headers(), accept: "application/json" },
          body: JSON.stringify({ data: { libraryId: "" } }),
        },
        async (response) => {
          const { pieStats } = await getStatisticsSchema.parseAsync(await response.json());
          return {
            libraryName: "All",
            totalFileCount: pieStats.totalFiles,
            totalTranscodeCount: pieStats.totalTranscodeCount,
            totalHealthCheckCount: pieStats.totalHealthCheckCount,
            failedTranscodeCount: pieStats.status.transcode.find((item) => item.name === "Transcode error")?.value ?? 0,
            failedHealthCheckCount: pieStats.status.healthcheck.find((item) => item.name === "Error")?.value ?? 0,
            stagedTranscodeCount:
              pieStats.status.transcode.find((item) => item.name === "Transcode success")?.value ?? 0,
            stagedHealthCheckCount: pieStats.status.healthcheck.find((item) => item.name === "Queued")?.value ?? 0,
            totalSavedSpace: pieStats.sizeDiff * 1_000_000_000,
            transcodeStatus: pieStats.status.transcode,
            healthCheckStatus: pieStats.status.healthcheck,
            videoCodecs: pieStats.video.codecs,
            videoContainers: pieStats.video.containers,
            videoResolutions: pieStats.video.resolutions,
            audioCodecs: pieStats.audio.codecs,
            audioContainers: pieStats.audio.containers,
          };
        },
      ),
    );
  }

  async getWorkersAsync(): Promise<TdarrWorker[]> {
    return this.runAsync((http) =>
      http.responseAsync(
        this.url("/api/v2/get-nodes"),
        { method: "GET", headers: this.headers() },
        async (response) => {
          const nodes = await getNodesResponseSchema.parseAsync(await response.json());
          return Object.values(nodes)
            .flatMap((node) => Object.values(node.workers))
            .map((worker) => ({
              id: worker._id,
              filePath: worker.file,
              fps: worker.fps,
              percentage: worker.percentage,
              ETA: worker.ETA,
              jobType: worker.job.type,
              status: worker.status,
              step: worker.lastPluginDetails?.number ?? "",
              originalSize: worker.originalfileSizeInGbytes * 1_000_000_000,
              estimatedSize: worker.estSize ? worker.estSize * 1_000_000_000 : null,
              outputSize: worker.outputFileSizeInGbytes ? worker.outputFileSizeInGbytes * 1_000_000_000 : null,
            }));
        },
      ),
    );
  }

  async getQueueAsync(firstItemIndex: number, pageSize: number): Promise<TdarrQueue> {
    return this.runAsync(async (http) => {
      const transcoding = await this.statusTableAsync(http, firstItemIndex, pageSize, "table1", "transcode");
      const health = await this.statusTableAsync(
        http,
        Math.max(firstItemIndex - transcoding.totalCount, 0),
        pageSize,
        "table4",
        "health-check",
      );
      const array = [...transcoding.array, ...health.array].slice(0, pageSize);
      return {
        array,
        totalCount: transcoding.totalCount + health.totalCount,
        startIndex: firstItemIndex,
        endIndex: firstItemIndex + array.length - 1,
      };
    });
  }

  private statusTableAsync(
    http: MediaHttpOperation,
    start: number,
    pageSize: number,
    table: "table1" | "table4",
    type: "transcode" | "health-check",
  ) {
    return http.responseAsync(
      this.url("/api/v2/client/status-tables"),
      {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ data: { start, pageSize, filters: [], sorts: [], opts: { table } } }),
      },
      async (response) => {
        const data = await getStatusTableSchema.parseAsync(await response.json());
        return {
          totalCount: data.totalCount,
          array: data.array.map((item) => ({
            id: item._id,
            healthCheck: item.HealthCheck,
            transcode: item.TranscodeDecisionMaker,
            filePath: item.file,
            fileSize: Math.floor(item.file_size * 1_000_000),
            container: item.container,
            codec: item.video_codec_name,
            resolution: item.video_resolution,
            type,
          })),
        };
      },
    );
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.hasSecret("apiKey") ? { "X-Api-Key": this.secret("apiKey") } : {}),
    };
  }
}
