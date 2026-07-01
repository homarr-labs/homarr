import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import { TestConnectionError } from "../base/test-connection/test-connection-error";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IMediaTranscodingIntegration } from "../interfaces/media-transcoding/media-transcoding-integration";
import type { TdarrQueue, TdarrStatistics, TdarrWorker } from "../interfaces/media-transcoding/media-transcoding-types";
import {
  libraryStatusSchema,
  recentlyFinishedSchema,
  shrinkageGroupsSchema,
  statusResponseSchema,
  upcomingFilesSchema,
  workersResponseSchema,
} from "./fileflows-validation-schemas";

export class FileFlowsIntegration extends Integration implements IMediaTranscodingIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const response = await input.fetchAsync(this.url("/api/system/version"), {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(super.hasSecretValue("apiKey") ? { "X-Api-Key": super.getSecretValue("apiKey") } : {}),
      },
    });

    if (!response.ok) return TestConnectionError.StatusResult(response);

    return { success: true };
  }

  public async getStatisticsAsync(): Promise<TdarrStatistics> {
    const headerParams = {
      accept: "application/json",
      "Content-Type": "application/json",
      ...(super.hasSecretValue("apiKey") ? { "X-Api-Key": super.getSecretValue("apiKey") } : {}),
    };

    const [statusData, libraryStatusData, shrinkageData] = await Promise.all([
      this.fetchStatusAsync(headerParams),
      this.fetchLibraryStatusAsync(headerParams),
      this.fetchShrinkageAsync(headerParams),
    ]);

    const failedCount = libraryStatusData
      .filter((item) => item.Status === 4)
      .reduce((sum, item) => sum + item.Count, 0);
    const processedCount = libraryStatusData
      .filter((item) => item.Status === 3)
      .reduce((sum, item) => sum + item.Count, 0);
    const queuedCount = libraryStatusData
      .filter((item) => item.Status === 1 || item.Status === 5)
      .reduce((sum, item) => sum + item.Count, 0);

    const totalSavedSpace = Object.values(shrinkageData).reduce(
      (sum, group) => sum + Math.max(0, group.OriginalSize - group.FinalSize),
      0,
    );

    const transcodeStatus = [
      { name: "Processed", value: statusData.processed },
      { name: "Queued", value: statusData.queue },
      { name: "Processing", value: statusData.processing },
      { name: "Failed", value: failedCount },
    ];

    return {
      libraryName: "All",
      totalFileCount: processedCount + queuedCount + statusData.processing + failedCount,
      totalTranscodeCount: statusData.processed,
      totalHealthCheckCount: 0,
      failedTranscodeCount: failedCount,
      failedHealthCheckCount: 0,
      stagedTranscodeCount: statusData.queue,
      stagedHealthCheckCount: 0,
      totalSavedSpace,
      transcodeStatus,
      healthCheckStatus: [],
      videoCodecs: [],
      videoContainers: [],
      videoResolutions: [],
      audioCodecs: [],
      audioContainers: [],
    };
  }

  public async getWorkersAsync(): Promise<TdarrWorker[]> {
    const headerParams = {
      "Content-Type": "application/json",
      ...(super.hasSecretValue("apiKey") ? { "X-Api-Key": super.getSecretValue("apiKey") } : {}),
    };

    const url = this.url("/api/worker");
    const response = await fetchWithTrustedCertificatesAsync(url, {
      method: "GET",
      headers: headerParams,
    });

    const workersData = await workersResponseSchema.parseAsync(await response.json());

    return workersData.map((worker) => ({
      id: worker.Uid,
      filePath: worker.RelativeFile ?? "",
      fps: 0,
      percentage: worker.CurrentPartPercent,
      ETA: worker.ProcessingTime?.TotalSeconds
        ? `${Math.round(worker.ProcessingTime.TotalSeconds)}s`
        : "",
      jobType: worker.CurrentPartName ?? "Processing",
      status: "Processing",
      step: worker.CurrentPartName ?? "",
      originalSize: worker.LibraryFile?.OriginalSize ?? 0,
      estimatedSize: null,
      outputSize: null,
    }));
  }

  public async getQueueAsync(firstItemIndex: number, pageSize: number): Promise<TdarrQueue> {
    const headerParams = {
      "Content-Type": "application/json",
      ...(super.hasSecretValue("apiKey") ? { "X-Api-Key": super.getSecretValue("apiKey") } : {}),
    };

    const [upcomingItems, recentlyFinishedItems] = await Promise.all([
      this.fetchUpcomingAsync(headerParams),
      this.fetchRecentlyFinishedAsync(headerParams),
    ]);

    const queueArray = [
      ...upcomingItems.map((item) => ({
        id: item.Uid,
        healthCheck: "",
        transcode: item.Flow ?? "Default",
        filePath: item.RelativePath ?? item.Name ?? "",
        fileSize: item.OriginalSize ?? 0,
        container: "",
        codec: "",
        resolution: "",
        type: "transcode" as const,
      })),
      ...recentlyFinishedItems.map((item) => ({
        id: item.Uid,
        healthCheck: "",
        transcode: item.Flow ?? "Default",
        filePath: item.RelativePath ?? item.Name ?? "",
        fileSize: item.FinalSize ?? item.OriginalSize ?? 0,
        container: "",
        codec: "",
        resolution: "",
        type: "health-check" as const,
      })),
    ].slice(0, pageSize);

    return {
      array: queueArray,
      totalCount: upcomingItems.length + recentlyFinishedItems.length,
      startIndex: firstItemIndex,
      endIndex: firstItemIndex + queueArray.length - 1,
    };
  }

  private async fetchStatusAsync(headerParams: Record<string, string>) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/status"), {
      method: "GET",
      headers: headerParams,
    });
    return statusResponseSchema.parseAsync(await response.json());
  }

  private async fetchLibraryStatusAsync(headerParams: Record<string, string>) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/library-file/status"), {
      method: "GET",
      headers: headerParams,
    });
    return libraryStatusSchema.parseAsync(await response.json());
  }

  private async fetchShrinkageAsync(headerParams: Record<string, string>) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/library-file/shrinkage-groups"), {
      method: "GET",
      headers: headerParams,
    });
    return shrinkageGroupsSchema.parseAsync(await response.json());
  }

  private async fetchUpcomingAsync(headerParams: Record<string, string>) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/library-file/upcoming"), {
      method: "GET",
      headers: headerParams,
    });
    return upcomingFilesSchema.parseAsync(await response.json());
  }

  private async fetchRecentlyFinishedAsync(headerParams: Record<string, string>) {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/api/library-file/recently-finished"), {
      method: "GET",
      headers: headerParams,
    });
    return recentlyFinishedSchema.parseAsync(await response.json());
  }
}
