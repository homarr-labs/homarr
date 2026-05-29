import { describe, expect, it } from "vitest";

import { getIntegrationDefaultPort } from "../integration";
import { buildIntegrationUrl } from "../integration-url-template";

describe("buildIntegrationUrl", () => {
  it("builds subdomain URL", () => {
    expect(buildIntegrationUrl("sonarr", "homelab.local", "subdomain")).toBe("https://sonarr.homelab.local");
  });

  it("builds hostPort URL with default port", () => {
    expect(buildIntegrationUrl("sonarr", "192.168.1.1", "hostPort")).toBe("http://192.168.1.1:8989");
  });

  it("uses docker port over default port", () => {
    expect(buildIntegrationUrl("sonarr", "192.168.1.1", "hostPort", 9999)).toBe("http://192.168.1.1:9999");
  });

  it("builds hostPort URL without port when none known", () => {
    expect(buildIntegrationUrl("mock", "192.168.1.1", "hostPort")).toBe("http://192.168.1.1");
  });

  it("strips trailing slashes from host", () => {
    expect(buildIntegrationUrl("sonarr", "homelab.local/", "subdomain")).toBe("https://sonarr.homelab.local");
    expect(buildIntegrationUrl("sonarr", "homelab.local///", "subdomain")).toBe("https://sonarr.homelab.local");
  });

  it("returns empty string for empty host", () => {
    expect(buildIntegrationUrl("sonarr", "", "subdomain")).toBe("");
  });

  it("uses pi-hole slug for subdomain mode", () => {
    expect(buildIntegrationUrl("piHole", "example.com", "subdomain")).toBe("https://pi-hole.example.com");
  });

  it("reads default ports from integration definitions", () => {
    expect(getIntegrationDefaultPort("radarr")).toBe(7878);
    expect(getIntegrationDefaultPort("prowlarr")).toBe(9696);
    expect(getIntegrationDefaultPort("jellyfin")).toBe(8096);
  });
});
