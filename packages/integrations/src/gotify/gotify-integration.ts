import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { Integration } from "../base/integration";
import type { IntegrationTestingInput } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { Notification } from "../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { gotifyMessagesResponseSchema } from "./gotify-schema";

export class GotifyIntegration extends Integration implements INotificationsIntegration {
  public async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    await input.fetchAsync(this.url("/health"), { headers: this.getHeaders() });
    return { success: true };
  }

  private getHeaders() {
    const credentials = Buffer.from(`${super.getSecretValue("username")}:${super.getSecretValue("password")}`).toString(
      "base64",
    );
    return { Authorization: `Basic ${credentials}` };
  }

  public async getNotificationsAsync(): Promise<Notification[]> {
    const url = this.url("/message", { limit: 100 });
    const response = await fetchWithTrustedCertificatesAsync(url, { headers: this.getHeaders() });

    if (!response.ok) throw new ResponseError(response);

    const result = await gotifyMessagesResponseSchema.safeParseAsync(await response.json());
    if (!result.success) throw new Error(`Failed to parse Gotify response: ${result.error.message}`);
    const parsed = result.data;

    return parsed.messages.map(
      (message): Notification => ({
        id: String(message.id),
        time: new Date(message.date),
        title: message.title,
        body: message.message,
      }),
    );
  }
}
