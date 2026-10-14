import { z } from "zod";

import type { IntegrationTestingInput } from "../../base/integration";
import type { TestingResult } from "../../base/test-connection/test-connection-service";
import type { IntegrationHttpAuthentication } from "../../http-auth";
import { basicAuth } from "../../http-auth";
import type { Notification } from "../../interfaces/notifications/notification-types";
import type { CalendarEvent } from "../../interfaces/calendar/calendar-types";
import { ntfyNotificationSchema } from "../../ntfy/ntfy-schema";
import { gotifyApplicationsResponseSchema, gotifyMessagesResponseSchema } from "../../gotify/gotify-schema";
import { IntegrationTransportStatusError } from "../../runtime/transport-errors";
import { SpecialistBranchHeldError, SpecialistProtocol } from "./protocol";

export class NtfyProtocol extends SpecialistProtocol {
  private headers(): Record<string, string> {
    return this.hasSecret("apiKey") ? { Authorization: `Bearer ${this.secret("apiKey")}` } : {};
  }

  public async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(this.url("/v1/account"), { headers: this.headers() }, async () => ({
      success: true,
    }));
  }

  async getNotificationsAsync(): Promise<Notification[]> {
    return this.runAsync(async (http) => {
      const text = await http.textAsync(this.url(`/${encodeURIComponent(this.secret("topic"))}/json`, { poll: 1 }), {
        headers: this.headers(),
      });
      const notifications = await Promise.all(
        text.split("\n").map(async (line) => {
          if (line.length === 0) return null;
          const json: unknown = JSON.parse(line);
          const parsed = await ntfyNotificationSchema.parseAsync(json);
          return parsed.event === "message" ? parsed : null;
        }),
      );
      return notifications
        .filter((notification) => notification !== null)
        .map((notification) => {
          const topicUrl = this.externalUrl(`/${notification.topic}`);
          return {
            id: notification.id,
            time: new Date(notification.time * 1000),
            title: notification.title ?? topicUrl.hostname + topicUrl.pathname,
            body: notification.message,
          };
        });
    });
  }
}

export class GotifyProtocol extends SpecialistProtocol {
  public async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    return this.testingHttp(input).responseAsync(this.url("/health"), { headers: this.basicHeaders() }, async () => ({
      success: true,
    }));
  }

  async getNotificationsAsync(): Promise<Notification[]> {
    throw new SpecialistBranchHeldError("gotify-image-url-registration");
  }

  async deleteNotificationAsync(id: string): Promise<void> {
    return this.interactAsync(() =>
      this.runAsync((http) =>
        http.responseAsync(
          this.url(`/message/${encodeURIComponent(id)}`),
          { method: "DELETE", headers: this.basicHeaders() },
          async (response) => {
            if (!response.ok) throw new IntegrationTransportStatusError(response.status);
          },
        ),
      ),
    );
  }
}

export const normalizeGotifyNotificationsCandidate = (
  messages: z.infer<typeof gotifyMessagesResponseSchema>,
  applications: z.infer<typeof gotifyApplicationsResponseSchema>,
  registeredIconUrls: ReadonlyMap<number, string | undefined>,
  externalBaseUrl: string,
): Notification[] => {
  const applicationsById = new Map(applications.map((application) => [application.id, application]));
  return messages.messages.map((message) => {
    const application = applicationsById.get(message.appid);
    const href = new URL(`${externalBaseUrl.replace(/\/+$/, "")}/`);
    href.hash = `/messages/${message.appid}`;
    return {
      id: String(message.id),
      time: new Date(message.date),
      title: message.title,
      body: message.message,
      contentType: message.extras?.["client::display"]?.contentType,
      href: href.toString(),
      source: application ? { name: application.name, iconUrl: registeredIconUrls.get(message.appid) } : undefined,
    };
  });
};

const nextcloudNotificationSchema = z.object({
  ocs: z.object({
    data: z.array(
      z.object({ notification_id: z.number(), datetime: z.string(), subject: z.string(), message: z.string() }),
    ),
  }),
});

export class NextcloudProtocol extends SpecialistProtocol {
  async getHttpAuthenticationAsync(): Promise<IntegrationHttpAuthentication> {
    this.resources.context.signal.throwIfAborted();
    return basicAuth("username", "password", { "OCS-APIRequest": "true" })(this.integration);
  }

  protected async testingAsync(_input: IntegrationTestingInput): Promise<TestingResult> {
    throw new SpecialistBranchHeldError("nextcloud-dav-node-fetch-agent");
  }

  async getCalendarEventsAsync(_start: Date, _end: Date, _showUnmonitored?: boolean): Promise<CalendarEvent[]> {
    throw new SpecialistBranchHeldError("nextcloud-dav-node-fetch-agent");
  }

  async getNotificationsAsync(): Promise<Notification[]> {
    return this.runAsync(async (http) => {
      const json = nextcloudNotificationSchema.parse(
        await http.jsonAsync(this.url("/ocs/v2.php/apps/notifications/api/v2/notifications", { format: "json" }), {
          headers: { ...this.basicHeaders(), "OCS-APIRequest": "true" },
        }),
      );
      return json.ocs.data.map((notification) => ({
        id: String(notification.notification_id),
        time: new Date(notification.datetime),
        title: notification.subject,
        body: notification.message,
      }));
    });
  }
}
