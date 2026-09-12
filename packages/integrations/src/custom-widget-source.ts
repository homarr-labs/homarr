import type { IntegrationInput } from "./base/integration";

/** Only integrations with a supported arbitrary HTTP authentication contract belong here. */
export function getCustomWidgetIntegrationConnection(integration: IntegrationInput) {
  switch (integration.kind) {
    case "sonarr":
    case "radarr": {
      const apiKey = integration.decryptedSecrets.find((secret) => secret.kind === "apiKey");
      if (!apiKey?.value) throw new Error("Integration API key is not configured");
      return {
        baseUrl: integration.url,
        auth: { type: "apiKeyHeader", headerName: "X-Api-Key", secrets: [apiKey] },
      };
    }
    default:
      throw new Error("Integration does not support custom widget requests");
  }
}
