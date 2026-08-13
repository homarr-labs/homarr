import { describe, expect, it } from "vitest";

import { getIntegrationApiKeyUrl, integrationDefs } from "../integration";

describe("getIntegrationApiKeyUrl", () => {
  it("links every user-facing integration to its Homarr setup guide", () => {
    expect(
      Object.entries(integrationDefs)
        .filter(([kind, definition]) => kind !== "mock" && !definition.documentationUrl)
        .map(([kind]) => kind),
    ).toEqual([]);
  });

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

  it("builds URL for patchmon", () => {
    expect(getIntegrationApiKeyUrl("http://patchmon.local:3413", "patchmon")).toBe(
      "http://patchmon.local:3413/settings/integrations",
    );
  });

  it.each([
    ["homeAssistant", "http://homeassistant.local:8123", "http://homeassistant.local:8123/profile/security"],
    ["opnsense", "https://firewall.local", "https://firewall.local/system_usermanager.php"],
    ["ntfy", "https://ntfy.local", "https://ntfy.local/account"],
    ["anchor", "http://anchor.local:8080", "http://anchor.local:8080/settings"],
    ["unraid", "http://tower.local", "http://tower.local/Settings/ManagementAccess"],
    ["coolify", "https://coolify.local", "https://coolify.local/security/api-tokens"],
    ["immich", "http://immich.local:2283", "http://immich.local:2283/user-settings"],
    ["tracearr", "http://tracearr.local:7040", "http://tracearr.local:7040/settings"],
    ["speedtestTracker", "http://speedtest.local", "http://speedtest.local/admin/api-tokens"],
    ["uptimeKuma", "http://uptime.local:3001", "http://uptime.local:3001/settings/api-keys"],
  ] as const)("builds a verified credential URL for %s", (kind, baseUrl, expected) => {
    expect(getIntegrationApiKeyUrl(baseUrl, kind)).toBe(expected);
  });

  it.each(["plex", "piHole", "truenas"] as const)(
    "returns null when %s has no version-safe credential path",
    (kind) => {
      expect(getIntegrationApiKeyUrl("http://localhost", kind)).toBeNull();
    },
  );

  it("returns null for empty URL", () => {
    expect(getIntegrationApiKeyUrl("", "sonarr")).toBeNull();
  });

  it("strips trailing slash from base URL", () => {
    expect(getIntegrationApiKeyUrl("http://sonarr.local/", "sonarr")).toBe("http://sonarr.local/settings/general");
  });
});
