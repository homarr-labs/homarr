import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { Notification } from "../interfaces/notifications/notification";
import { NotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { ntfyNotificationSchema } from "./ntfy-schema";

export class NTFYIntegration extends NotificationsIntegration {
  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(this.url("/v1/account"), { headers: this.getHeaders() });
      },
    });
  }

  private getTopicURL(topics: string[]) {
    return this.url(`/${topics.join(",")}/json`, { poll: 1 });
  }
  private getHeaders() {
    return this.hasSecretValue("apiKey") ? { Authorization: `Bearer ${super.getSecretValue("apiKey")}` } : {};
  }

  public async getNotificationsAsync(topics: string[]) {
    // can't fetch notifications without a topic
    if (topics.length == 0) return [];

    const url = this.getTopicURL(topics);
    const notifications = await Promise.all(
      (
        await fetchWithTrustedCertificatesAsync(url, { headers: this.getHeaders() })
          .then((response) => {
            if (!response.ok) {
              throw new Error(response.statusText);
            }
            return response.text();
          })
          .catch((error) => {
            if (error instanceof Error) {
              throw new Error(error.message);
            } else {
              throw new Error("Error communicating with ntfy");
            }
          })
      )
        // response is provided as individual lines of JSON
        .split("\n")
        .map(async (line) => {
          // ignore empty lines
          if (line.length == 0) return null;

          const json = JSON.parse(line) as unknown;
          const parsed = await ntfyNotificationSchema.safeParseAsync(json);
          if (parsed.success) return parsed.data;
          // ignore invalid formatted messages
          else return null;
        }),
    );

    return notifications
      .filter((notification) => notification !== null)
      .map((notification): Notification => {
        const topicURL = this.url(`/${notification.topic}`);
        return {
          id: notification.id,
          time: new Date(notification.time * 1000),
          title: notification.title ?? topicURL.hostname + topicURL.pathname,
          body: notification.message,
        };
      });
  }
}
