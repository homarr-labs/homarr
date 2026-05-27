import { describe, expect, it } from "vitest";

import { getIntegrationApiKeyUrl } from "../integration";

describe("getIntegrationApiKeyUrl", () => {
  it("builds URL for sonarr", () => {
    expect(getIntegrationApiKeyUrl("http://192.168.1.10:8989", "sonarr")).toBe(
      "http://192.168.1.10:8989/settings/general",
    );
  });

  it("builds URL for jellyfin", () => {
    expect(getIntegrationApiKeyUrl("http://media.local:8096", "jellyfin")).toBe(
      "http://media.local:8096/web/index.html#!/dashboard/keys",
    );
  });

  it("returns null for integrations without apiKeySettingsPath", () => {
    expect(getIntegrationApiKeyUrl("http://localhost", "plex")).toBeNull();
  });

  it("returns null for empty URL", () => {
    expect(getIntegrationApiKeyUrl("", "sonarr")).toBeNull();
  });

  it("strips trailing slash from base URL", () => {
    expect(getIntegrationApiKeyUrl("http://sonarr.local/", "sonarr")).toBe("http://sonarr.local/settings/general");
  });
});
