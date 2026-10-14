import type { QBittorrent } from "@ctrl/qbittorrent";
import dayjs from "dayjs";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import { TestConnectionError } from "../../base/test-connection/test-connection-error";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import { DownloadClientHoldError } from "./contracts";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

export class NativeQBittorrentClient extends NativeDownloadClient implements DownloadPublicClient<"qBittorrent"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "qBittorrent");
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.operationAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async () => {
      const client = await this.getVersionedClientAsync();
      const torrents = await client.listTorrents({ limit: input.limit });
      const rates = torrents.reduce(
        ({ down, up }, { dlspeed, upspeed }) => ({ down: down + dlspeed, up: up + upspeed }),
        { down: 0, up: 0 },
      );
      const paused = torrents.find(({ state }) => this.getTorrentState(state) !== "paused") === undefined;
      return {
        status: { paused, rates, types: ["torrent"] },
        items: torrents.map((torrent): DownloadClientItem => ({
          type: "torrent",
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
          state: this.getTorrentState(torrent.state),
          progress: torrent.progress,
          category: torrent.category,
        })),
      };
    });
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.getVersionedClientAsync();
    if (!(await client.login())) return TestConnectionError.UnauthorizedResult(401);
    return { success: true };
  }

  protected async prepareControlAsync(_input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    const client = await this.getVersionedClientAsync();
    switch (control.type) {
      case "pauseQueue":
        await client.pauseTorrent("all");
        return;
      case "resumeQueue":
        await client.resumeTorrent("all");
        return;
      case "pauseItem":
        await client.pauseTorrent(control.item.id);
        return;
      case "resumeItem":
        await client.resumeTorrent(control.item.id);
        return;
      case "deleteItem":
        await client.removeTorrent(control.item.id, control.fromDisk);
    }
  }

  private async getVersionedClientAsync(): Promise<QBittorrent> {
    const client = await this.getClientAsync();
    await client.getAppVersion();
    return client;
  }

  private async getClientAsync(): Promise<QBittorrent> {
    throw new DownloadClientHoldError(this.kind, "sdk-request-ownership");
  }

  private getTorrentState(state: string): DownloadClientItem["state"] {
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
      default:
        return "unknown";
    }
  }
}
