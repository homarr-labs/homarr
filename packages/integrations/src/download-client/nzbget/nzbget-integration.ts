import { Client as NzbGetClient } from "@jc21/nzbget-jsonrpc-api";
import dayjs from "dayjs";

import type { DownloadClientData } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";

export class NzbGetIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    const client = this.getClient();
    await client.status();
  }

  public async getClientDataAsync(): Promise<DownloadClientData> {
    const type = "usenet";
    const nzbGetClient = this.getClient();
    const queue = await nzbGetClient.listgroups();
    const history = await nzbGetClient.history();
    const nzbGetStatus = await nzbGetClient.status();
    const status: DownloadClientStatus = {
      paused: nzbGetStatus.DownloadPaused,
      rates: { down: nzbGetStatus.DownloadRate },
      type,
    };
    const items = queue
      .map((file): DownloadClientItem => {
        const state = this.getNzbQueueState(file.Status);
        return {
          type,
          id: file.NZBID.toString(),
          index: file.MaxPriority,
          name: file.NZBName,
          size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
          downSpeed: file.ActiveDownloads > 0 ? nzbGetStatus.DownloadRate : 0,
          time: (file.RemainingSizeLo + file.RemainingSizeHi * Math.pow(2, 32)) / (nzbGetStatus.DownloadRate / 1000),
          added: dayjs().valueOf() - file.DownloadTimeSec * 1000,
          state,
          progress: file.DownloadedSizeMB / file.FileSizeMB,
          category: file.Category,
        };
      })
      .concat(
        history.map((file, index): DownloadClientItem => {
          const state = this.getNzbHistoryState(file.ScriptStatus);
          return {
            type,
            id: file.NZBID.toString(),
            index,
            name: file.Name,
            size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
            time: dayjs().valueOf() - file.HistoryTime * 1000,
            added: (file.HistoryTime - file.DownloadTimeSec) * 1000,
            state,
            progress: 1,
            category: file.Category,
          };
        }),
      );
    return { status, items };
  }

  public async pauseQueueAsync() {
    await this.getClient().pausedownload();
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().editqueue("GroupPause", "", [Number(id)]);
  }

  public async resumeQueueAsync() {
    await this.getClient().resumedownload();
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.getClient().editqueue("GroupResume", "", [Number(id)]);
  }

  public async deleteItemAsync({ id, progress }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    const client = this.getClient();
    if (fromDisk) {
      const filesIds = (await client.listfiles(Number(id))).map((value) => value.ID);
      await this.getClient().editqueue("FileDelete", "", filesIds);
    }
    if (progress !== 1) {
      await client.editqueue("GroupFinalDelete", "", [Number(id)]);
    } else {
      await client.editqueue("HistoryFinalDelete", "", [Number(id)]);
    }
  }

  private getClient() {
    const url = new URL(this.integration.url);
    url.username = this.getSecretValue("username");
    url.password = this.getSecretValue("password");
    //url.pathname += `${this.getSecretValue("username")}:${this.getSecretValue("password")}`;
    url.pathname += url.pathname.endsWith("/") ? "jsonrpc" : "/jsonrpc";
    return new NzbGetClient(url);
  }

  private getNzbQueueState(status: string): DownloadClientItem["state"] {
    switch (status) {
      case "QUEUED":
        return "queued";
      case "PAUSED":
        return "paused";
      default:
        return "downloading";
    }
  }

  private getNzbHistoryState(status: string): DownloadClientItem["state"] {
    switch (status) {
      case "FAILURE":
        return "failed";
      case "SUCCESS":
        return "completed";
      default:
        return "processing";
    }
  }
}
