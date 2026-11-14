import type { Notification } from "../../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../../interfaces/notifications/notifications-integration";

const publishedAt = Date.now();
const notifications = [
  { title: "Library scan finished", body: "Jellyfin has indexed the media library.", minutesAgo: 8 },
  { title: "Home Assistant connected", body: "Five areas and 25 entities are available.", minutesAgo: 22 },
  { title: "DNS filter lists updated", body: "The DNS resolver has loaded its current block lists.", minutesAgo: 47 },
  {
    title: "Package updates available",
    body: "Five hosts have updates available, including seven security updates.",
    minutesAgo: 90,
  },
  {
    title: "Backup verified",
    body: "The latest backup passed its integrity check. The backup node is now offline.",
    minutesAgo: 180,
  },
  { title: "Dashboard saved", body: "The Home and Services tabs are saved.", minutesAgo: 360 },
];

export class NotificationsMockService implements INotificationsIntegration {
  public async getNotificationsAsync(): Promise<Notification[]> {
    return notifications.map((notification, index) => ({
      id: index.toString(),
      time: new Date(publishedAt - notification.minutesAgo * 60_000),
      title: notification.title,
      body: notification.body,
    }));
  }
}
