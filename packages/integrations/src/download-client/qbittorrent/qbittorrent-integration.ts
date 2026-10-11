import { QBittorrent } from "@ctrl/qbittorrent";
import dayjs from "dayjs";
import type { Dispatcher } from "undici";

import { createCertificateAgentAsync } from "@homarr/core/infrastructure/http";

import { HandleIntegrationErrors } from "../../base/errors/decorator";
import { integrationOFetchHttpErrorHandler } from "../../base/errors/http";
import { Integration } from "../../base/integration";
import type { IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type {
  DownloadClientSelection,
  IDownloadClientIntegration,
} from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

@HandleIntegrationErrors([integrationOFetchHttpErrorHandler])
export class QBitTorrentIntegration extends Integration implements IDownloadClientIntegration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.getClientAsync(input.dispatcher);
    const isSuccess = await client.login();
    if (!isSuccess) return TestConnectionError.UnauthorizedResult(401);

    return {
      success: true,
    };
  }

  public async getClientJobsAndStatusAsync(input: {
    limit: number;
    selection?: DownloadClientSelection;
  }): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = await this.getClientAsync();
    const torrents = await this.getSelectedTorrentsAsync(client, input);
    const rates = torrents.reduce(
      ({ down, up }, { dlspeed, upspeed }) => ({ down: down + dlspeed, up: up + upspeed }),
      { down: 0, up: 0 },
    );
    const paused =
      torrents.find(({ state }) => QBitTorrentIntegration.getTorrentState(state) !== "paused") === undefined;
    const status: DownloadClientStatus = { paused, rates, types: [type] };
    const items = torrents.map((torrent): DownloadClientItem => {
      const state = QBitTorrentIntegration.getTorrentState(torrent.state);
      return {
        type,
        id: torrent.hash,
        index: torrent.priority,
        name: torrent.name,
        size: torrent.size,
        sent: torrent.uploaded,
        downSpeed: torrent.progress !== 1 ? torrent.dlspeed : undefined,
        upSpeed: torrent.upspeed,
        time:
          torrent.progress === 1
            ? Math.min(torrent.completion_on * 1000 - dayjs().valueOf(), -1)
            : torrent.eta === 8640000
              ? 0
              : Math.max(torrent.eta * 1000, 0),
        added: torrent.added_on * 1000,
        state,
        progress: torrent.progress,
        category: torrent.category,
      };
    });
    return { status, items };
  }

  private async getSelectedTorrentsAsync(
    client: QBittorrent,
    { limit, selection }: { limit: number; selection?: DownloadClientSelection },
  ) {
    if (!selection) return await client.listTorrents({ limit });

    // Only fields with the same meaning in the provider and widget can select the remote window.
    const sortFields: Record<string, string> = {
      name: "name",
      progress: "progress",
      size: "size",
      added: "added_on",
      index: "priority",
      upSpeed: "upspeed",
      downSpeed: "dlspeed",
      sent: "uploaded",
    };
    let category: string | undefined;
    if (selection.filterIsWhitelist && selection.categoryFilter.length === 1) {
      category = selection.categoryFilter[0];
    }

    // Bound every response, retained items, and total work even when nearly the whole queue is hidden.
    let pageSize = Math.min(limit, 100);
    if (
      selection.categoryFilter.length > 0 ||
      !selection.showCompletedTorrent ||
      selection.activeTorrentThreshold > 0
    ) {
      pageSize = 100;
    }
    const torrents: Awaited<ReturnType<QBittorrent["listTorrents"]>> = [];
    const seen = new Set<string>();
    for (let page = 0; page < 100 && torrents.length < limit; page++) {
      const batch = await client.listTorrents({
        limit: pageSize,
        offset: page * pageSize,
        sort: sortFields[selection.sort],
        reverse: selection.descending,
        category,
      });
      for (const torrent of batch) {
        if (seen.has(torrent.hash)) continue;
        seen.add(torrent.hash);
        if (selection.categoryFilter.length > 0) {
          const matches = selection.categoryFilter.includes(torrent.category);
          if (selection.filterIsWhitelist !== matches) continue;
        }
        if (torrent.progress >= 1) {
          if (!selection.showCompletedTorrent) continue;
          if (torrent.upspeed < selection.activeTorrentThreshold * 1024) continue;
        }
        torrents.push(torrent);
        if (torrents.length >= limit) break;
      }
      if (batch.length < pageSize) break;
    }
    return torrents;
  }

  public async pauseQueueAsync() {
    const client = await this.getClientAsync();
    await client.pauseTorrent("all");
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = await this.getClientAsync();
    await client.resumeTorrent("all");
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.resumeTorrent(id);
  }

  public async deleteItemAsync({ id }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = await this.getClientAsync();
    await client.removeTorrent(id, fromDisk);
  }

  private async getClientAsync(dispatcher?: Dispatcher) {
    const credentials = this.hasSecretValue("apiKey")
      ? {
          apiKey: this.getSecretValue("apiKey"),
        }
      : {
          username: this.getSecretValue("username"),
          password: this.getSecretValue("password"),
        };

    const client = new QBittorrent({
      ...credentials,
      baseUrl: this.url("/").toString(),
      dispatcher: dispatcher ?? (await createCertificateAgentAsync()),
    });
    // Populate version state so the library uses correct v5 endpoints (stop/start vs pause/resume)
    await client.getAppVersion();
    return client;
  }

  private static getTorrentState(state: string): DownloadClientItem["state"] {
    switch (state) {
      case "allocating":
      case "checkingDL":
      case "downloading":
      case "forcedDL":
      case "forcedMetaDL":
      case "metaDL":
      case "queuedDL":
      case "queuedForChecking":
        return "leeching";
      case "checkingUP":
      case "forcedUP":
      case "queuedUP":
      case "uploading":
      case "stalledUP":
        return "seeding";
      case "pausedDL":
      case "pausedUP":
      case "stoppedDL":
      case "stoppedUP":
        return "paused";
      case "stalledDL":
        return "stalled";
      case "error":
      case "checkingResumeData":
      case "missingFiles":
      case "moving":
      case "unknown":
      default:
        return "unknown";
    }
  }
}
