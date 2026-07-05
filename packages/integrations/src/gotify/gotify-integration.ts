import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { ImageProxy } from "@homarr/image-proxy";

import { Integration } from "../base/integration";
import type { IntegrationTestingInput } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { Notification } from "../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { gotifyApplicationsResponseSchema, gotifyMessagesResponseSchema } from "./gotify-schema";

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

  private getMessagesUrl(applicationId: number) {
    const url = this.externalUrl("/");
    url.hash = `/messages/${applicationId}`;
    return url.toString();
  }

  private async getApplicationsByIdAsync(): Promise<Map<number, { name: string; image?: string | null }>> {
    try {
      const response = await fetchWithTrustedCertificatesAsync(this.url("/application"), {
        headers: this.getHeaders(),
      });
      if (!response.ok) throw new ResponseError(response);

      const result = await gotifyApplicationsResponseSchema.safeParseAsync(await response.json());
      if (!result.success) return new Map();

      return new Map(result.data.map((application) => [application.id, application]));
    } catch {
      return new Map();
    }
  }

  private async getApplicationIconUrlAsync(
    imageProxy: ImageProxy,
    imagePath: string | null | undefined,
  ): Promise<string | undefined> {
    const trimmedImagePath = imagePath?.trim();
    if (!trimmedImagePath) return undefined;

    try {
      const imageUrl = this.getApplicationImageUrl(trimmedImagePath);
      return await imageProxy.createImageAsync(imageUrl, this.getHeaders());
    } catch {
      return undefined;
    }
  }

  private getApplicationImageUrl(imagePath: string) {
    try {
      return new URL(imagePath).toString();
    } catch {
      const path = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
      return this.url(path as `/${string}`).toString();
    }
  }

  public async getNotificationsAsync(): Promise<Notification[]> {
    const [messagesResponse, applicationsById] = await Promise.all([
      fetchWithTrustedCertificatesAsync(this.url("/message", { limit: 100 }), { headers: this.getHeaders() }),
      this.getApplicationsByIdAsync(),
    ]);

    if (!messagesResponse.ok) throw new ResponseError(messagesResponse);

    const messagesResult = await gotifyMessagesResponseSchema.safeParseAsync(await messagesResponse.json());
    if (!messagesResult.success) throw new Error(`Failed to parse Gotify response: ${messagesResult.error.message}`);

    const imageProxy = new ImageProxy();
    const iconUrlsByApplicationId = new Map<number, string | undefined>();
    await Promise.all(
      [...applicationsById.entries()].map(async ([applicationId, application]) => {
        iconUrlsByApplicationId.set(
          applicationId,
          await this.getApplicationIconUrlAsync(imageProxy, application.image),
        );
      }),
    );

    return messagesResult.data.messages.map((message): Notification => {
      const application = applicationsById.get(message.appid);

      return {
        id: String(message.id),
        time: new Date(message.date),
        title: message.title,
        body: message.message,
        href: this.getMessagesUrl(message.appid),
        source: application
          ? {
              name: application.name,
              iconUrl: iconUrlsByApplicationId.get(message.appid),
            }
          : undefined,
      };
    });
  }
}
