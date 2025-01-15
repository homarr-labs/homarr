import { Transmission } from "@ctrl/transmission";
import dayjs from "dayjs";

import { createCertificateAgentAsync } from "@homarr/certificates/server";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class TransmissionIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    const client = await this.getClientAsync();
    await client.getSession();
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "torrent";
    const client = await this.getClientAsync();
    const { torrents } = (await client.listTorrents()).arguments;
    const rates = torrents.reduce(
      ({ down, up }, { rateDownload, rateUpload }) => ({ down: down + rateDownload, up: up + rateUpload }),
      { down: 0, up: 0 },
    );
    const paused =
      torrents.find(({ status }) => TransmissionIntegration.getTorrentState(status) !== "paused") === undefined;
    const status: DownloadClientStatus = { paused, rates, type };
    const items = torrents.map((torrent): DownloadClientItem => {
      const state = TransmissionIntegration.getTorrentState(torrent.status);
      return {
        type,
        id: torrent.hashString,
        index: torrent.queuePosition,
        name: torrent.name,
        size: torrent.totalSize,
        sent: torrent.uploadedEver,
        downSpeed: torrent.percentDone !== 1 ? torrent.rateDownload : undefined,
        upSpeed: torrent.rateUpload,
        time:
          torrent.percentDone === 1
            ? Math.min(torrent.doneDate * 1000 - dayjs().valueOf(), -1)
            : Math.max(torrent.eta * 1000, 0),
        added: torrent.addedDate * 1000,
        state,
        progress: torrent.percentDone,
        category: torrent.labels,
      };
    });
    return { status, items };
  }

  public async pauseQueueAsync() {
    const client = await this.getClientAsync();
    const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
    await client.pauseTorrent(ids);
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.pauseTorrent(id);
  }

  public async resumeQueueAsync() {
    const client = await this.getClientAsync();
    const ids = (await client.listTorrents()).arguments.torrents.map(({ hashString }) => hashString);
    await client.resumeTorrent(ids);
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    const client = await this.getClientAsync();
    await client.resumeTorrent(id);
  }

  public async deleteItemAsync({ id }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = await this.getClientAsync();
    await client.removeTorrent(id, fromDisk);
  }

  private async getClientAsync() {
    return new Transmission({
      baseUrl: this.url("/").toString(),
      username: this.getSecretValue("username"),
      password: this.getSecretValue("password"),
      dispatcher: await createCertificateAgentAsync(),
    });
  }

  private static getTorrentState(status: number): DownloadClientItem["state"] {
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
