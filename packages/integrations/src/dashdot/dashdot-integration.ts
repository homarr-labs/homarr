import {Integration} from "../base/integration";

export class DashDotIntegration extends Integration {
    public async testConnectionAsync(): Promise<void> {
      const response = await fetch(this.integration.url + (this.integration.url.endsWith("/") ? "info" : "/info"));
      await response.json();
    }
}