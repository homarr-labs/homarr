import { Integration } from "../../base/integration";
import type { Notification } from "./notification";

export abstract class NotificationsIntegration extends Integration {
  /** Get current notification list. */
  public abstract getNotificationsAsync(topics: string[]): Promise<Notification[]>;
}
