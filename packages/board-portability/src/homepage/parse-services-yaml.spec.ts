import { describe, expect, test } from "vitest";

import { parseServicesYaml } from "./parse-services-yaml";

const sampleYaml = `
- Media:
    - Sonarr:
        icon: sonarr.png
        href: http://sonarr.host/
        description: Series management
        ping: sonarr.host
        widget:
          type: sonarr
          url: http://sonarr.host
          key: apikeyhere
    - Radarr:
        icon: radarr.png
        href: http://radarr.host/
        widgets:
          - type: radarr
            url: http://radarr.host
            key: radarrkey
- Downloads:
    - qBittorrent:
        icon: qbittorrent.png
        href: http://qbit.host/
        widget:
          type: qbittorrent
          url: http://qbit.host
          username: admin
          password: pass123
`;

describe("parseServicesYaml", () => {
  test("parses groups, services, singular widget, and plural widgets", () => {
    const result = parseServicesYaml(sampleYaml);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.services).toHaveLength(3);

    const sonarr = result.services.find((service) => service.name === "Sonarr");
    expect(sonarr).toMatchObject({
      group: "Media",
      href: "http://sonarr.host/",
      ping: "sonarr.host",
    });
    expect(sonarr?.widgets).toHaveLength(1);
    expect(sonarr?.widgets[0]).toMatchObject({ type: "sonarr", key: "apikeyhere" });

    const radarr = result.services.find((service) => service.name === "Radarr");
    expect(radarr?.widgets).toHaveLength(1);
    expect(radarr?.widgets[0]?.type).toBe("radarr");

    const qbit = result.services.find((service) => service.name === "qBittorrent");
    expect(qbit?.group).toBe("Downloads");
    expect(qbit?.widgets[0]).toMatchObject({ type: "qbittorrent", username: "admin" });
  });

  test("flattens nested groups with separator", () => {
    const yaml = `
- Parent:
    - Child:
        - Service:
            href: http://service.local
`;
    const result = parseServicesYaml(yaml);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.services[0]?.group).toBe("Parent / Child");
    expect(result.services[0]?.name).toBe("Service");
  });

  test("parses services without widgets", () => {
    const yaml = `
- Tools:
    - Homepage:
        href: http://homepage.local
`;
    const result = parseServicesYaml(yaml);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.services[0]?.widgets).toEqual([]);
  });

  test("returns empty services for empty content", () => {
    expect(parseServicesYaml("   ")).toEqual({ success: true, services: [] });
  });

  test("handles malformed yaml gracefully", () => {
    const result = parseServicesYaml("invalid: yaml: [");
    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }
    expect(result.error).toBe("Invalid YAML");
  });

  test("rejects non-array root documents", () => {
    const result = parseServicesYaml("name: not-an-array");
    expect(result).toEqual({ success: false, error: "Homepage services.yaml must be a YAML array" });
  });
});
