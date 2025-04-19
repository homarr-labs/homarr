import { fetchWithTrustedCertificatesAsync } from "@homarr/certificates/server";

import type { Notification } from "../interfaces/notifications/notification";
import { NotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { ntfyNotificationPollSchema } from "./ntfy-schema";

export class NTFYIntegration extends NotificationsIntegration {
  public async testConnectionAsync(): Promise<void> {
    await super.handleTestConnectionResponseAsync({
      queryFunctionAsync: async () => {
        return await fetchWithTrustedCertificatesAsync(
          this.url("/v1/account"),
          this.hasSecretValue("apiKey")
            ? {
                headers: { Authorization: `Bearer ${super.getSecretValue("apiKey")}` },
              }
            : {},
        );
      },
    });
  }

  private getTopicURL(topic: string) {
    return this.url(`/${topic}/json`, { poll: 1 });
  }

  public async getNotificationsAsync(topics: string[]) {
    const notifications = await Promise.all(
      topics.map(async (topic) => {
        const url = this.getTopicURL(topic);
        return await ntfyNotificationPollSchema.parseAsync(
          await fetchWithTrustedCertificatesAsync(url)
            .then((response) => {
              if (!response.ok) {
                throw new Error(response.statusText);
              }
              return response.json();
            })
            .catch((error) => {
              if (error instanceof Error) {
                throw new Error(error.message);
              } else {
                throw new Error("Error communicating with ntfy");
              }
            }),
        );
      }),
    );

    return notifications.flat(1).map((notification): Notification => {
      return {
        id: notification.id,
        time: new Date(notification.time),
        title: notification.title,
        body: notification.message,
      };
    });
  }
}
