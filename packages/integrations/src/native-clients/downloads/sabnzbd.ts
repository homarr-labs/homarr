import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

import type { IntegrationInput, IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import { historySchema, queueSchema } from "../../download-client/sabnzbd/sabnzbd-schema";
import type { DownloadClientJobsAndStatus } from "../../interfaces/downloads/download-client-data";
import type { DownloadClientItem } from "../../interfaces/downloads/download-client-items";
import type { IntegrationRuntimeResources } from "../../runtime/contracts";
import { NativeDownloadClient } from "./base";
import type { DownloadControl, DownloadPublicClient } from "./contracts";
import { getSabnzbdHistorySlotsAsync } from "./sabnzbd-history";

dayjs.extend(duration);

export class NativeSabnzbdClient extends NativeDownloadClient implements DownloadPublicClient<"sabNzbd"> {
  constructor(integration: IntegrationInput, resources: IntegrationRuntimeResources) {
    super(integration, resources, "sabNzbd");
  }

  public async getClientJobsAndStatusAsync(input: {
    limit: number;
    includeArchivedHistory?: boolean;
    historyWindowDays?: number;
  }): Promise<DownloadClientJobsAndStatus> {
    return await this.queryAsync<DownloadClientJobsAndStatus>("getClientJobsAndStatusAsync", async (transport) => {
      const [queueResult, historyResult] = await Promise.allSettled([
        this.apiCallAsync(transport, "queue", { limit: input.limit.toString() }).then((result) =>
          queueSchema.parseAsync(result),
        ),
        this.apiCallAsync(transport, "history", { limit: input.limit.toString() }).then((result) =>
          historySchema.parseAsync(result),
        ),
      ]);
      if (queueResult.status === "rejected") throw queueResult.reason;
      if (historyResult.status === "rejected") throw historyResult.reason;
      const { queue } = queueResult.value;
      const { history } = historyResult.value;
      const historySlots = input.includeArchivedHistory
        ? await getSabnzbdHistorySlotsAsync({
            activeSlots: history.slots,
            historyWindowDays: input.historyWindowDays ?? 7,
            fetchPageAsync: async ({ start, limit }) => {
              const archived = await historySchema.parseAsync(
                await this.apiCallAsync(transport, "history", {
                  archive: "1",
                  start: start.toString(),
                  limit: limit.toString(),
                }),
              );
              return archived.history.slots;
            },
          })
        : history.slots;
      const down = Math.floor(Number(queue.kbpersec) * 1024);
      const items = queue.slots
        .map((slot): DownloadClientItem => {
          const times = slot.timeleft.split(":").reverse();
          return {
            type: "usenet",
            id: slot.nzo_id,
            index: slot.index,
            name: slot.filename,
            size: Math.ceil(parseFloat(slot.mb) * 1024 * 1024),
            downSpeed: slot.index > 0 ? 0 : down,
            time: dayjs
              .duration({
                seconds: Number(times[0] ?? 0),
                minutes: Number(times[1] ?? 0),
                hours: Number(times[2] ?? 0),
                days: Number(times[3] ?? 0),
              })
              .asMilliseconds(),
            state: slot.status === "Queued" ? "queued" : slot.status === "Paused" ? "paused" : "downloading",
            progress: parseFloat(slot.percentage) / 100,
            category: slot.cat,
          };
        })
        .concat(
          historySlots.map((slot, index): DownloadClientItem => ({
            type: "usenet",
            id: slot.nzo_id,
            index,
            name: slot.name,
            size: slot.bytes,
            time: slot.completed * 1000 - dayjs().valueOf(),
            added: (slot.completed - slot.download_time - slot.postproc_time) * 1000,
            state: slot.status === "Completed" ? "completed" : slot.status === "Failed" ? "failed" : "processing",
            progress: 1,
            category: slot.category,
          })),
        )
        .slice(0, input.limit);
      return { status: { paused: queue.paused, rates: { down }, types: ["usenet"] }, items };
    });
  }

  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await this.apiCallAsync(input, "translate", { value: "ping" });
    return { success: true };
  }

  protected async prepareControlAsync(input: IntegrationTestingInput, control: DownloadControl): Promise<void> {
    switch (control.type) {
      case "pauseQueue":
        await this.apiCallAsync(input, "pause");
        return;
      case "resumeQueue":
        await this.apiCallAsync(input, "resume");
        return;
      case "pauseItem":
        await this.apiCallAsync(input, "queue", { name: "pause", value: control.item.id });
        return;
      case "resumeItem":
        await this.apiCallAsync(input, "queue", { name: "resume", value: control.item.id });
        return;
      case "deleteItem":
        await this.apiCallAsync(input, control.item.progress !== 1 ? "queue" : "history", {
          name: "delete",
          archive: control.fromDisk ? "0" : "1",
          value: control.item.id,
          del_files: control.fromDisk ? "1" : "0",
        });
    }
  }

  private async apiCallAsync(
    input: IntegrationTestingInput,
    mode: string,
    searchParams?: Record<string, string>,
  ): Promise<unknown> {
    try {
      return await this.requestJsonAsync(
        input,
        this.url("/api", { ...searchParams, output: "json", mode, apikey: this.secret("apiKey") }),
      );
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error("Error communicating with SABnzbd");
    }
  }
}
