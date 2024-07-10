import { Integration } from "../base/integration";

/**
 * Overseerr Integration. See https://api-docs.overseerr.dev
 */
export class OverseerrIntegration extends Integration {
    public async testConnectionAsync(): Promise<void> {
      const response = await fetch(`${this.integration.url}/api/v1/auth/me`, {
        headers: {
          'X-Api-Key': this.getSecretValue('apiKey')
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const json: object = await response.json();
      if (Object.keys(json).includes("id")) {
        return;
      }
      throw new Error(`Received response but unable to parse it: ${JSON.stringify(json)}`);
    }

}