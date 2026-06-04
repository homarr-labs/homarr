import type { ContainerInfo } from "dockerode";
import { describe, expect, test } from "vitest";

import { dockerLabels, homepageLabels } from "../../labels";
import { parseContainerLabels } from "../parse-container-labels";

const createContainer = (labels: Record<string, string>): Pick<ContainerInfo, "Id" | "Labels"> => ({
  Id: "container-abc123",
  Labels: labels,
});

describe("parseContainerLabels", () => {
  test("parses full homarr labels into DiscoveredService", () => {
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

  test("falls back to homepage labels when homarr.name is absent", () => {
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

  test("skips containers with homarr.hide", () => {
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

  test("skips containers missing required labels", () => {
    expect(
      parseContainerLabels(
        createContainer({
          [dockerLabels.name]: "Incomplete",
          [dockerLabels.href]: "https://incomplete.local",
        }),
        "socket",
      ),
    ).toBeNull();

    expect(
      parseContainerLabels(
        createContainer({
          [homepageLabels.name]: "No group",
          [homepageLabels.href]: "https://nogroup.local",
        }),
        "socket",
      ),
    ).toBeNull();
  });

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
});
