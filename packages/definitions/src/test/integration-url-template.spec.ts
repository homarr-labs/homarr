import { describe, expect, it } from "vitest";

import { getIntegrationDefaultPort } from "../integration";
import { buildAppUrl, buildIntegrationUrl } from "../integration-url-template";

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

  it("accepts full URLs but ignores their path when suggesting service URLs", () => {
    expect(buildIntegrationUrl("sonarr", "https://home.example.com/homarr", "hostPort")).toBe(
      "http://home.example.com:8989",
    );
    expect(buildAppUrl("My Service", "http://home.example.com/path", "subdomain")).toBe(
      "https://my-service.home.example.com",
    );
  });

  it("builds reverse-proxy path URLs and preserves the configured base path", () => {
    expect(buildIntegrationUrl("sonarr", "https://home.example.com/services", "path")).toBe(
      "https://home.example.com/services/sonarr",
    );
    expect(buildAppUrl("My Service", "home.lan/apps/", "path", 9999)).toBe("http://home.lan/apps/my-service");
  });

  it("replaces a supplied base port instead of producing a double port", () => {
    expect(buildIntegrationUrl("sonarr", "https://home.example.com:8443/homarr", "hostPort")).toBe(
      "http://home.example.com:8989",
    );
    expect(buildAppUrl("My Service", "https://home.example.com:8443/homarr", "hostPort")).toBe(
      "http://home.example.com:8443",
    );
  });

  it("preserves an explicitly supplied default port for an app", () => {
    expect(buildAppUrl("My Service", "https://home.example.com:443/homarr", "hostPort")).toBe(
      "http://home.example.com:443",
    );
  });

  it("formats IPv6 hosts safely in host-port mode", () => {
    expect(buildIntegrationUrl("sonarr", "https://[2001:db8::1]:8443/homarr", "hostPort")).toBe(
      "http://[2001:db8::1]:8989",
    );
    expect(buildIntegrationUrl("sonarr", "[2001:db8::1]", "subdomain")).toBe("");
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
    expect(getIntegrationDefaultPort("technitiumDns")).toBe(5380);
    expect(getIntegrationDefaultPort("dashDot")).toBe(3001);
    expect(getIntegrationDefaultPort("gotify")).toBe(80);
    expect(getIntegrationDefaultPort("peaNut")).toBe(8080);
    expect(getIntegrationDefaultPort("gluetun")).toBe(8000);
    expect(getIntegrationDefaultPort("archiveTeamWarrior")).toBe(8001);
  });
});
