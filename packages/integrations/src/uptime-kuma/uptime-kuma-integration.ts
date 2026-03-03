import { Monitor, UptimeKumaClient } from "@ruslanpdf/uptime-kuma-api";



import type { IntegrationInput, IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { SessionStore } from "../base/session-store";
import { createSessionStore } from "../base/session-store";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { IUptimeKumaIntegration } from "../interfaces/uptime-kuma/uptime-kuma-integration";
import type { UptimeKumaCheck } from "../interfaces/uptime-kuma/uptime-kuma-types";

export class UptimeKumaIntegration extends Integration implements IUptimeKumaIntegration {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  private client: UptimeKumaClient = null!;

  private readonly sessionStore: SessionStore<{ monitors: Monitor[] }>;

  constructor(integration: IntegrationInput) {
    super(integration);
    this.sessionStore = createSessionStore(integration);
  }

  protected async testingAsync(_: IntegrationTestingInput): Promise<TestingResult> {
    await this.createClientAndAuthenticateAsync();
    return { success: true };
  }

  public async listChecksAsync(): Promise<UptimeKumaCheck[]> {
    await this.createClientAndAuthenticateAsync();

    let session = await this.sessionStore.getAsync();
    if (!session) {
      const monitors = await this.client.getMonitors();
      await this.sessionStore.setAsync({ monitors });
      session = await this.sessionStore.getAsync();
    }

    this.client.getMonitorHeartbeats(1)
  }

  private async createClientAndAuthenticateAsync() {
    this.client = new UptimeKumaClient({ url: this.integration.url });
    await this.client.connect();
    if (this.hasSecretValue("apiKey")) {
      await this.client.loginByToken(this.getSecretValue("apiKey"));
    } else {
      await this.client.login({ username: this.getSecretValue("username"), password: this.getSecretValue("password") });
    }
  }
}
