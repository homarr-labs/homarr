import { Client } from "sabnzbd-api";
import type {UsenetQueueItem} from "../interfaces/usnet-downloads/usenet-queue-item";
import type {UsenetHistoryItem} from "../interfaces/usnet-downloads/usenet-history-item";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import {UsenetIntegration} from "../interfaces/usnet-downloads/usenet-integration";
dayjs.extend(duration);

export class SabnzbdIntegration extends UsenetIntegration {
  public async testConnectionAsync(): Promise<void> {
    await this.getSabnzbdClient().fullStatus();
  }

  public async getCurrentQueueAsync(): Promise<UsenetQueueItem[]> {
    const sabnzbdClient = this.getSabnzbdClient();
    const queue = await sabnzbdClient.queue();
    return queue.slots.map((slot): UsenetQueueItem => {
      const status = slot.status as UsenetQueueItem["state"];
      const [hours, minutes, seconds] = slot.timeleft.split(':');

      let eta = 0;
      if (hours !== undefined && minutes !== undefined && seconds !== undefined) {
        eta = dayjs.duration({
          hours: parseInt(hours, 10),
          minutes: parseInt(minutes, 10),
          seconds: parseInt(seconds, 10),
        }).asMilliseconds();
      }
      return {
        id: slot.nzo_id,
        estimatedTimeOfArrival: eta,
        name: slot.filename,
        progress: parseFloat(slot.percentage),
        sizeInBytes: parseFloat(slot.mb) * 1000 * 1000,
        state: status,
      };
    })
  }

  public async getHistoryAsync(): Promise<UsenetHistoryItem[]> {
    const history = await this.getSabnzbdClient().history();
    return history.slots.map((slot): UsenetHistoryItem => {
      return {
        id: slot.nzo_id,
        name: slot.name,
        size: slot.bytes,
        time: slot.download_time
      };
    });
  }

  public async pauseQueueAsync() {
    await this.getSabnzbdClient().queuePause();
  }

  public async resumeQueueAsync() {
    await this.getSabnzbdClient().queueResume();
  }

  private getSabnzbdClient() {
    return new Client(this.integration.url, this.getSecretValue('apiKey'));
  }
}