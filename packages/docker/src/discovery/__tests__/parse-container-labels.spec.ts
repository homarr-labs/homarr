import type { ContainerInfo } from "dockerode";
import { describe, expect, test } from "vitest";

import { dockerLabels, homepageLabels } from "../../labels";
import { parseContainerLabels } from "../parse-container-labels";

const createContainer = (
  labels: Record<string, string>,
  id = "container-abc123",
): Pick<ContainerInfo, "Id" | "Labels"> => ({
  Id: id,
  Labels: labels,
});

describe("parseContainerLabels", () => {
  describe("homarr native labels", () => {
    test("parses all homarr labels into DiscoveredService", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Jellyfin",
          [dockerLabels.href]: "https://jellyfin.local",
          [dockerLabels.icon]: "https://cdn.example/icon.png",
          [dockerLabels.description]: "Media server",
          [dockerLabels.ping]: "https://jellyfin.local/health",
          [dockerLabels.id]: "jellyfin-1",
          [dockerLabels.board]: "homelab",
          [dockerLabels.integration]: "jellyfin",
          [dockerLabels.widget]: "mediaServer",
        }),
        "socket",
      );

      expect(result).toEqual({
        containerId: "container-abc123",
        host: "socket",
        group: "Media",
        name: "Jellyfin",
        href: "https://jellyfin.local",
        icon: "https://cdn.example/icon.png",
        description: "Media server",
        pingUrl: "https://jellyfin.local/health",
        externalId: "jellyfin-1",
        boardName: "homelab",
        integrationKind: "jellyfin",
        widgetKind: "mediaServer",
      });
    });

    test("parses minimal required homarr labels (name, group, href)", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Networking",
          [dockerLabels.name]: "Pi-hole",
          [dockerLabels.href]: "http://pihole:80/admin",
        }),
        "socket",
      );

      expect(result).toEqual({
        containerId: "container-abc123",
        host: "socket",
        group: "Networking",
        name: "Pi-hole",
        href: "http://pihole:80/admin",
        externalId: "container-abc123",
      });
    });

    test("uses container ID as externalId when homarr.id is absent", () => {
      const result = parseContainerLabels(
        createContainer(
          {
            [dockerLabels.group]: "Media",
            [dockerLabels.name]: "Plex",
            [dockerLabels.href]: "http://plex:32400",
          },
          "sha256:deadbeef1234",
        ),
        "socket",
      );

      expect(result?.externalId).toBe("sha256:deadbeef1234");
    });

    test("uses homarr.id as externalId when present", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Plex",
          [dockerLabels.href]: "http://plex:32400",
          [dockerLabels.id]: "plex-server-main",
        }),
        "socket",
      );

      expect(result?.externalId).toBe("plex-server-main");
    });
  });

  describe("homepage fallback labels", () => {
    test("uses homepage labels when homarr.name is absent", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.group]: "Downloads",
          [homepageLabels.name]: "Sonarr",
          [homepageLabels.href]: "https://sonarr.local",
          [homepageLabels.icon]: "https://cdn.example/sonarr.png",
          [homepageLabels.description]: "TV shows",
        }),
        "192.168.1.10:2375",
      );

      expect(result).toEqual({
        containerId: "container-abc123",
        host: "192.168.1.10:2375",
        group: "Downloads",
        name: "Sonarr",
        href: "https://sonarr.local",
        icon: "https://cdn.example/sonarr.png",
        description: "TV shows",
        externalId: "container-abc123",
      });
    });

    test("does not use homepage fallback when readHomepageLabels is false", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.group]: "Downloads",
          [homepageLabels.name]: "Sonarr",
          [homepageLabels.href]: "https://sonarr.local",
        }),
        "socket",
        { readHomepageLabels: false },
      );

      expect(result).toBeNull();
    });

    test("homepage labels have no ping, board, integration, or widget support", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.group]: "Media",
          [homepageLabels.name]: "Emby",
          [homepageLabels.href]: "http://emby:8096",
        }),
        "socket",
      );

      expect(result?.pingUrl).toBeUndefined();
      expect(result?.boardName).toBeUndefined();
      expect(result?.integrationKind).toBeUndefined();
      expect(result?.widgetKind).toBeUndefined();
    });
  });

  describe("label priority and mixing", () => {
    test("prefers homarr labels over homepage when both are present", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Homarr Group",
          [dockerLabels.name]: "Homarr Name",
          [dockerLabels.href]: "https://homarr.local",
          [homepageLabels.group]: "Homepage Group",
          [homepageLabels.name]: "Homepage Name",
          [homepageLabels.href]: "https://homepage.local",
        }),
        "socket",
      );

      expect(result?.group).toBe("Homarr Group");
      expect(result?.name).toBe("Homarr Name");
      expect(result?.href).toBe("https://homarr.local");
    });

    test("disables homepage fallback entirely when homarr.name is present", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.name]: "MyApp",
          [dockerLabels.href]: "http://myapp:3000",
          [homepageLabels.group]: "FromHomepage",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("uses homarr icon with homepage name/group/href when homarr.name absent but homarr.icon present", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.group]: "Media",
          [homepageLabels.name]: "Jellyfin",
          [homepageLabels.href]: "http://jellyfin:8096",
          [dockerLabels.icon]: "https://custom-icon.example/jf.png",
        }),
        "socket",
      );

      expect(result?.name).toBe("Jellyfin");
      expect(result?.icon).toBe("https://custom-icon.example/jf.png");
    });
  });

  describe("homarr.hide", () => {
    test("skips container when homarr.hide is present with value 'true'", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.hide]: "true",
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Hidden",
          [dockerLabels.href]: "https://hidden.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("skips container when homarr.hide is present with empty value", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.hide]: "",
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Hidden",
          [dockerLabels.href]: "https://hidden.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("skips container when homarr.hide is any string (key presence is enough)", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.hide]: "anything",
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Hidden",
          [dockerLabels.href]: "https://hidden.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });
  });

  describe("missing required labels", () => {
    test("returns null when group is missing", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.name]: "NoGroup",
          [dockerLabels.href]: "https://nogroup.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("returns null when name is missing", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.href]: "https://noname.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("returns null when href is missing", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "NoHref",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });

    test("returns null when homepage labels are incomplete (missing group)", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.name]: "Incomplete",
          [homepageLabels.href]: "http://incomplete.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });
  });

  describe("whitespace handling", () => {
    test("trims whitespace from all label values", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "  Media  ",
          [dockerLabels.name]: "  Jellyfin  ",
          [dockerLabels.href]: "  https://jellyfin.local  ",
          [dockerLabels.icon]: "  https://icon.png  ",
          [dockerLabels.description]: "  A media server  ",
        }),
        "socket",
      );

      expect(result?.group).toBe("Media");
      expect(result?.name).toBe("Jellyfin");
      expect(result?.href).toBe("https://jellyfin.local");
      expect(result?.icon).toBe("https://icon.png");
      expect(result?.description).toBe("A media server");
    });

    test("treats whitespace-only values as empty (missing)", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "   ",
          [dockerLabels.href]: "https://example.local",
        }),
        "socket",
      );

      expect(result).toBeNull();
    });
  });

  describe("integration and widget kind validation", () => {
    test("parses valid integration kind", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Radarr",
          [dockerLabels.href]: "http://radarr:7878",
          [dockerLabels.integration]: "radarr",
        }),
        "socket",
      );

      expect(result?.integrationKind).toBe("radarr");
    });

    test("ignores invalid integration kind", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Custom App",
          [dockerLabels.href]: "http://custom:3000",
          [dockerLabels.integration]: "nonExistentIntegration",
        }),
        "socket",
      );

      expect(result?.integrationKind).toBeUndefined();
    });

    test("parses valid widget kind", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Jellyfin",
          [dockerLabels.href]: "http://jellyfin:8096",
          [dockerLabels.widget]: "mediaServer",
        }),
        "socket",
      );

      expect(result?.widgetKind).toBe("mediaServer");
    });

    test("ignores invalid widget kind", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "Custom",
          [dockerLabels.href]: "http://custom:3000",
          [dockerLabels.widget]: "totallyFakeWidget",
        }),
        "socket",
      );

      expect(result?.widgetKind).toBeUndefined();
    });

    test("handles empty integration kind gracefully", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Media",
          [dockerLabels.name]: "App",
          [dockerLabels.href]: "http://app:3000",
          [dockerLabels.integration]: "",
        }),
        "socket",
      );

      expect(result?.integrationKind).toBeUndefined();
    });
  });

  describe("real-world scenarios", () => {
    test("homepage-only service (common migration use case)", () => {
      const result = parseContainerLabels(
        createContainer({
          [homepageLabels.group]: "Monitoring",
          [homepageLabels.name]: "Grafana",
          [homepageLabels.href]: "http://grafana:3000",
          [homepageLabels.icon]: "grafana",
          [homepageLabels.description]: "Metrics and dashboards",
        }),
        "tcp://192.168.1.50:2375",
      );

      expect(result).toEqual({
        containerId: "container-abc123",
        host: "tcp://192.168.1.50:2375",
        group: "Monitoring",
        name: "Grafana",
        href: "http://grafana:3000",
        icon: "grafana",
        description: "Metrics and dashboards",
        externalId: "container-abc123",
      });
    });

    test("service targeting a specific board", () => {
      const result = parseContainerLabels(
        createContainer({
          [dockerLabels.group]: "Infrastructure",
          [dockerLabels.name]: "Traefik",
          [dockerLabels.href]: "http://traefik:8080",
          [dockerLabels.board]: "networking-board",
          [dockerLabels.icon]: "https://cdn.example/traefik.svg",
        }),
        "socket",
      );

      expect(result?.boardName).toBe("networking-board");
    });

    test("service with all optional fields empty uses defaults", () => {
      const result = parseContainerLabels(
        createContainer(
          {
            [dockerLabels.group]: "Tools",
            [dockerLabels.name]: "Portainer",
            [dockerLabels.href]: "http://portainer:9000",
          },
          "abc123def456",
        ),
        "socket",
      );

      expect(result?.icon).toBeUndefined();
      expect(result?.description).toBeUndefined();
      expect(result?.pingUrl).toBeUndefined();
      expect(result?.boardName).toBeUndefined();
      expect(result?.integrationKind).toBeUndefined();
      expect(result?.widgetKind).toBeUndefined();
      expect(result?.externalId).toBe("abc123def456");
    });

    test("container with no labels returns null", () => {
      const result = parseContainerLabels(createContainer({}), "socket");
      expect(result).toBeNull();
    });
  });
});
