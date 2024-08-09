import {Integration} from "../../base/integration";
import type {UsenetQueueItem} from "./usenet-queue-item";
import type {UsenetHistoryItem} from "./usenet-history-item";

export abstract class UsenetIntegration extends Integration {
  public abstract getCurrentQueueAsync(): Promise<UsenetQueueItem[]>;
  public abstract getHistoryAsync(): Promise<UsenetHistoryItem[]>;
  public abstract pauseQueueAsync(): Promise<void>;
  public abstract resumeQueueAsync(): Promise<void>;
}