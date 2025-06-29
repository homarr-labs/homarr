import type { Notification } from "./notification";

export interface INotificationsIntegration {
  getNotificationsAsync(): Promise<Notification[]>;
}
