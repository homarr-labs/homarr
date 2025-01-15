import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";
import { z } from "@homarr/validation";

import { Integration } from "../base/integration";
import type { TdarrQueue } from "../interfaces/media-transcoding/queue";
import type { TdarrStatistics } from "../interfaces/media-transcoding/statistics";
import type { TdarrWorker } from "../interfaces/media-transcoding/workers";
import { getNodesResponseSchema, getStatisticsSchema, getStatusTableSchema } from "./tdarr-validation-schemas";

export class TdarrIntegration extends Integration {
  public async testConnectionAsync(): Promise<void> {
    const url = this.url("/api/v2/status");
    const response = await fetchWithTrustedCertificatesAsync(url);
    if (response.status !== 200) {
      throw new Error(`Unexpected status code: ${response.status}`);
    }

    await z.object({ status: z.string() }).parseAsync(await response.json());
  }

  public async getStatisticsAsync(): Promise<TdarrStatistics> {
    const url = this.url("/api/v2/cruddb");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          collection: "StatisticsJSONDB",
          mode: "getById",
          docID: "statistics",
        },
      }),
    });

    const statisticsData = await getStatisticsSchema.parseAsync(await response.json());

    return {
      totalFileCount: statisticsData.totalFileCount,
      totalTranscodeCount: statisticsData.totalTranscodeCount,
      totalHealthCheckCount: statisticsData.totalHealthCheckCount,
      failedTranscodeCount: statisticsData.table3Count,
      failedHealthCheckCount: statisticsData.table6Count,
      stagedTranscodeCount: statisticsData.table1Count,
      stagedHealthCheckCount: statisticsData.table4Count,
      pies: statisticsData.pies.map((pie) => ({
        libraryName: pie[0],
        libraryId: pie[1],
        totalFiles: pie[2],
        totalTranscodes: pie[3],
        savedSpace: pie[4] * 1_000_000_000, // file_size is in GB, convert to bytes,
        totalHealthChecks: pie[5],
        transcodeStatus: pie[6],
        healthCheckStatus: pie[7],
        videoCodecs: pie[8],
        videoContainers: pie[9],
        videoResolutions: pie[10],
        audioCodecs: pie[11],
        audioContainers: pie[12],
      })),
    };
  }

  public async getWorkersAsync(): Promise<TdarrWorker[]> {
    const url = this.url("/api/v2/get-nodes");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    const nodesData = await getNodesResponseSchema.parseAsync(await response.json());
    const workers = Object.values(nodesData).flatMap((node) => {
      return Object.values(node.workers);
    });

    return workers.map((worker) => ({
      id: worker._id,
      filePath: worker.file,
      fps: worker.fps,
      percentage: worker.percentage,
      ETA: worker.ETA,
      jobType: worker.job.type,
      status: worker.status,
      step: worker.lastPluginDetails?.number ?? "",
      originalSize: worker.originalfileSizeInGbytes * 1_000_000_000, // file_size is in GB, convert to bytes,
      estimatedSize: worker.estSize ? worker.estSize * 1_000_000_000 : null, // file_size is in GB, convert to bytes,
      outputSize: worker.outputFileSizeInGbytes ? worker.outputFileSizeInGbytes * 1_000_000_000 : null, // file_size is in GB, convert to bytes,
    }));
  }

  public async getQueueAsync(firstItemIndex: number, pageSize: number): Promise<TdarrQueue> {
    const transcodingQueue = await this.getTranscodingQueueAsync(firstItemIndex, pageSize);
    const healthChecks = await this.getHealthCheckDataAsync(firstItemIndex, pageSize, transcodingQueue.totalCount);

    const combinedArray = [...transcodingQueue.array, ...healthChecks.array].slice(0, pageSize);
    return {
      array: combinedArray,
      totalCount: transcodingQueue.totalCount + healthChecks.totalCount,
      startIndex: firstItemIndex,
      endIndex: firstItemIndex + combinedArray.length - 1,
    };
  }

  private async getTranscodingQueueAsync(firstItemIndex: number, pageSize: number) {
    const url = this.url("/api/v2/client/status-tables");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          start: firstItemIndex,
          pageSize,
          filters: [],
          sorts: [],
          opts: { table: "table1" },
        },
      }),
    });
    const transcodesQueueData = await getStatusTableSchema.parseAsync(await response.json());

    return {
      array: transcodesQueueData.array.map((item) => ({
        id: item._id,
        healthCheck: item.HealthCheck,
        transcode: item.TranscodeDecisionMaker,
        filePath: item.file,
        fileSize: item.file_size * 1_000_000, // file_size is in MB, convert to bytes
        container: item.container,
        codec: item.video_codec_name,
        resolution: item.video_resolution,
        type: "transcode" as const,
      })),
      totalCount: transcodesQueueData.totalCount,
      startIndex: firstItemIndex,
      endIndex: firstItemIndex + transcodesQueueData.array.length - 1,
    };
  }

  private async getHealthCheckDataAsync(firstItemIndex: number, pageSize: number, totalQueueCount: number) {
    const url = this.url("/api/v2/client/status-tables");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: {
          start: Math.max(firstItemIndex - totalQueueCount, 0),
          pageSize,
          filters: [],
          sorts: [],
          opts: {
            table: "table4",
          },
        },
      }),
    });

    const healthCheckData = await getStatusTableSchema.parseAsync(await response.json());

    return {
      array: healthCheckData.array.map((item) => ({
        id: item._id,
        healthCheck: item.HealthCheck,
        transcode: item.TranscodeDecisionMaker,
        filePath: item.file,
        fileSize: item.file_size * 1_000_000, // file_size is in MB, convert to bytes
        container: item.container,
        codec: item.video_codec_name,
        resolution: item.video_resolution,
        type: "health-check" as const,
      })),
      totalCount: healthCheckData.totalCount,
    };
  }
}
