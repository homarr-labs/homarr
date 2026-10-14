import type { Transmission } from "@ctrl/transmission";
import dayjs from "dayjs";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import { DownloadClientHoldError } from "./contracts";
import type { DownloadControl, DownloadPublicClient } from "./contracts";

export class NativeTransmissionClient extends NativeDownloadClient implements DownloadPublicClient<"transmission"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "transmission");
  }

  public async getClientJobsAndStatusAsync(input: { limit: number }): Promise<DownloadClientJobsAndStatus> {
    return await this.operationAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async () => {
      const client = await this.getClientAsync();
      const { torrents } = (await client.listTorrents()).arguments;
      const rates = torrents.reduce(
        ({ down, up }, { rateDownload, rateUpload }) => ({ down: down + rateDownload, up: up + rateUpload }),
        { down: 0, up: 0 },
      );
      const paused = torrents.find(({ status }) => this.getTorrentState(status) !== "paused") === undefined;
      return {
        status: { paused, rates, types: ["torrent"] },
        items: torrents.slice(0, input.limit).map((torrent): DownloadClientItem => ({
          type: "torrent",
          id: torrent.hashString,
          index: torrent.queuePosition,
          name: torrent.name,
          size: torrent.totalSize,
          sent: torrent.uploadedEver,
          received: torrent.downloadedEver,
          downSpeed: torrent.percentDone !== 1 ? torrent.rateDownload : undefined,
          upSpeed: torrent.rateUpload,
          time:
            torrent.percentDone === 1
              ? Math.min(torrent.doneDate * 1000 - dayjs().valueOf(), -1)
              : Math.max(torrent.eta * 1000, 0),
          added: torrent.addedDate * 1000,
          state: this.getTorrentState(torrent.status),
          progress: torrent.percentDone,
          category: torrent.labels,
        })),
      };
    });
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    const client = await this.getClientAsync();
    await client.getSession();
    return { success: true };
  }

  protected async prepareControlAsync(_input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    const client = await this.getClientAsync();
    switch (control.type) {
      case "pauseQueue": {
        const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
        await client.pauseTorrent(ids);
        return;
      }
      case "resumeQueue": {
        const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
        await client.resumeTorrent(ids);
        return;
      }
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

  private async getClientAsync(): Promise<Transmission> {
    throw new DownloadClientHoldError(this.kind, "sdk-request-ownership");
  }

  private getTorrentState(status: number): DownloadClientItem["state"] {
    switch (status) {
      case 0:
        return "paused";
      case 1:
      case 3:
        return "stalled";
      case 2:
      case 4:
        return "leeching";
      case 5:
      case 6:
        return "seeding";
      default:
        return "unknown";
    }
  }
}
