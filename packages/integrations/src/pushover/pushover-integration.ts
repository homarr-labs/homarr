import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { Integration } from "../base/integration";
import type { IntegrationTestingInput } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { Notification } from "../interfaces/notifications/notification-types";
import type { INotificationsIntegration } from "../interfaces/notifications/notifications-integration";
import { pushoverLimitsResponseSchema } from "./pushover-schema";

export class PushoverIntegration extends Integration implements INotificationsIntegration {
  public async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const token = this.getSecretValue("apiKey");
    const url = this.url("/1/apps/limits.json", { token });
    const response = await input.fetchAsync(url);

    if (!response.ok) throw new ResponseError(response);

    const result = await pushoverLimitsResponseSchema.safeParseAsync(await response.json());
    if (!result.success) throw new Error(`Failed to parse Pushover response: ${result.error.message}`);
    if (result.data.status !== 1) throw new Error("Pushover API returned non-success status");

    return { success: true };
  }

  public async getNotificationsAsync(): Promise<Notification[]> {
    const token = this.getSecretValue("apiKey");
    const url = this.url("/1/apps/limits.json", { token });
    const response = await fetchWithTrustedCertificatesAsync(url);

    if (!response.ok) throw new ResponseError(response);

    const result = await pushoverLimitsResponseSchema.safeParseAsync(await response.json());
    if (!result.success) throw new Error(`Failed to parse Pushover response: ${result.error.message}`);

    return [];
  }
}
