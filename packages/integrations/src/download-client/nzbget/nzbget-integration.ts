import dayjs from "dayjs";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";
import type { NzbGetClient } from "./nzbget-types";

export class NzbGetIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    await this.nzbGetApiCallAsync("version");
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "usenet";
    const queue = await this.nzbGetApiCallAsync("listgroups");
    const history = await this.nzbGetApiCallAsync("history");
    const nzbGetStatus = await this.nzbGetApiCallAsync("status");
    const status: DownloadClientStatus = {
      paused: nzbGetStatus.DownloadPaused,
      rates: { down: nzbGetStatus.DownloadRate },
      type,
    };
    const items = queue
      .map((file): DownloadClientItem => {
        const state = NzbGetIntegration.getUsenetQueueState(file.Status);
        const time =
          (file.RemainingSizeLo + file.RemainingSizeHi * Math.pow(2, 32)) / (nzbGetStatus.DownloadRate / 1000);
        return {
          type,
          id: file.NZBID.toString(),
          index: file.MaxPriority,
          name: file.NZBName,
          size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
          downSpeed: file.ActiveDownloads > 0 ? nzbGetStatus.DownloadRate : 0,
          time: Number.isFinite(time) ? time : 0,
          added: (dayjs().unix() - file.DownloadTimeSec) * 1000,
          state,
          progress: file.DownloadedSizeMB / file.FileSizeMB,
          category: file.Category,
        };
      })
      .concat(
        history.map((file, index): DownloadClientItem => {
          const state = NzbGetIntegration.getUsenetHistoryState(file.ScriptStatus);
          return {
            type,
            id: file.NZBID.toString(),
            index,
            name: file.Name,
            size: file.FileSizeLo + file.FileSizeHi * Math.pow(2, 32),
            time: (dayjs().unix() - file.HistoryTime) * 1000,
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
    await this.nzbGetApiCallAsync("pausedownload");
  }

  public async pauseItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.nzbGetApiCallAsync("editqueue", "GroupPause", "", [Number(id)]);
  }

  public async resumeQueueAsync() {
    await this.nzbGetApiCallAsync("resumedownload");
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.nzbGetApiCallAsync("editqueue", "GroupResume", "", [Number(id)]);
  }

  public async deleteItemAsync({ id, progress }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    if (fromDisk) {
      const filesIds = (await this.nzbGetApiCallAsync("listfiles", 0, 0, Number(id))).map((file) => file.ID);
      await this.nzbGetApiCallAsync("editqueue", "FileDelete", "", filesIds);
    }
    if (progress === 1) {
      await this.nzbGetApiCallAsync("editqueue", "GroupFinalDelete", "", [Number(id)]);
    } else {
      await this.nzbGetApiCallAsync("editqueue", "HistoryFinalDelete", "", [Number(id)]);
    }
  }

  private async nzbGetApiCallAsync<CallType extends keyof NzbGetClient>(
    method: CallType,
    ...params: Parameters<NzbGetClient[CallType]>
  ): Promise<ReturnType<NzbGetClient[CallType]>> {
    const username = this.getSecretValue("username");
    const password = this.getSecretValue("password");
    const url = this.url(`/${username}:${password}/jsonrpc`);
    const body = JSON.stringify({ method, params });
    return await fetch(url, { method: "POST", body })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return ((await response.json()) as { result: ReturnType<NzbGetClient[CallType]> }).result;
      })
      .catch((error) => {
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw new Error("Error communicating with NzbGet");
        }
      });
  }

  private static getUsenetQueueState(status: string): DownloadClientItem["state"] {
    switch (status) {
      case "QUEUED":
        return "queued";
      case "PAUSED":
        return "paused";
      default:
        return "downloading";
    }
  }

  private static getUsenetHistoryState(status: string): DownloadClientItem["state"] {
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
