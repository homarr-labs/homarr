import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import { DownloadClientIntegration } from "../../interfaces/downloads/download-client-integration";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { DownloadClientStatus } from "../../interfaces/downloads/download-client-status";
import { historySchema, queueSchema } from "./sabnzbd-schema";

dayjs.extend(duration);

export class SabnzbdIntegration extends DownloadClientIntegration {
  public async testConnectionAsync(): Promise<void> {
    //This is the one call that uses the least amount of data while requiring the api key
    await this.sabNzbApiCallAsync("translate", new URLSearchParams({ value: "ping" }));
  }

  public async getClientJobsAndStatusAsync(): Promise<DownloadClientJobsAndStatus> {
    const type = "usenet";
    const { queue } = await queueSchema.parseAsync(await this.sabNzbApiCallAsync("queue"));
    const { history } = await historySchema.parseAsync(await this.sabNzbApiCallAsync("history"));
    const status: DownloadClientStatus = {
      paused: queue.paused,
      rates: { down: Math.floor(Number(queue.kbpersec) * 1024) }, //Actually rounded kiBps ()
      type,
    };
    const items = queue.slots
      .map((slot): DownloadClientItem => {
        const state = SabnzbdIntegration.getNzbQueueState(slot.status);
        const times = slot.timeleft.split(":").reverse();
        const time = dayjs
          .duration({
            seconds: Number(times[0] ?? 0),
            minutes: Number(times[1] ?? 0),
            hours: Number(times[2] ?? 0),
            days: Number(times[3] ?? 0),
          })
          .asMilliseconds();
        return {
          type,
          id: slot.nzo_id,
          index: slot.index,
          name: slot.filename,
          size: Math.ceil(parseFloat(slot.mb) * 1024 * 1024), //Actually rounded MiB
          downSpeed: slot.index > 0 ? 0 : status.rates.down,
          time,
          //added: 0, <- Only part from all integrations that is missing the timestamp (or from which it could be inferred)
          state,
          progress: parseFloat(slot.percentage) / 100,
          category: slot.cat,
        };
      })
      .concat(
        history.slots.map((slot, index): DownloadClientItem => {
          const state = SabnzbdIntegration.getNzbHistoryState(slot.status);
          return {
            type,
            id: slot.nzo_id,
            index,
            name: slot.name,
            size: slot.bytes,
            time: slot.completed * 1000 - dayjs().valueOf(),
            added: (slot.completed - slot.download_time - slot.postproc_time) * 1000,
            state,
            progress: 1,
            category: slot.category,
          };
        }),
      );
    return { status, items };
  }

  public async pauseQueueAsync() {
    await this.sabNzbApiCallAsync("pause");
  }

  public async pauseItemAsync({ id }: DownloadClientItem) {
    await this.sabNzbApiCallAsync("queue", new URLSearchParams({ name: "pause", value: id }));
  }

  public async resumeQueueAsync() {
    await this.sabNzbApiCallAsync("resume");
  }

  public async resumeItemAsync({ id }: DownloadClientItem): Promise<void> {
    await this.sabNzbApiCallAsync("queue", new URLSearchParams({ name: "resume", value: id }));
  }

  //Delete files prevented on completed files. https://github.com/sabnzbd/sabnzbd/issues/2754
  //Works on all other in downloading and post-processing.
  //Will stop working as soon as the finished files is moved to completed folder.
  public async deleteItemAsync({ id, progress }: DownloadClientItem, fromDisk: boolean): Promise<void> {
    await this.sabNzbApiCallAsync(
      progress !== 1 ? "queue" : "history",
      new URLSearchParams({
        name: "delete",
        archive: fromDisk ? "0" : "1",
        value: id,
        del_files: fromDisk ? "1" : "0",
      }),
    );
  }

  private async sabNzbApiCallAsync(mode: string, searchParams?: URLSearchParams): Promise<unknown> {
    const url = new URL("api", this.integration.url);
    url.searchParams.append("output", "json");
    url.searchParams.append("mode", mode);
    searchParams?.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
    url.searchParams.append("apikey", this.getSecretValue("apiKey"));
    return await fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json() as Promise<unknown>;
      })
      .catch((error) => {
        if (error instanceof Error) {
          throw new Error(error.message);
        } else {
          throw new Error("Error communicating with SABnzbd");
        }
      });
  }

  private static getNzbQueueState(status: string): DownloadClientItem["state"] {
    switch (status) {
      case "Queued":
        return "queued";
      case "Paused":
        return "paused";
      default:
        return "downloading";
    }
  }

  private static getNzbHistoryState(status: string): DownloadClientItem["state"] {
    switch (status) {
      case "Completed":
        return "completed";
      case "Failed":
        return "failed";
      default:
        return "processing";
    }
  }
}
