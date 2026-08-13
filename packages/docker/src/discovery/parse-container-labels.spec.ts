import { describe, expect, it } from "vitest";

import { parseContainerLabels } from "./parse-container-labels";

const container = (Labels: Record<string, string>, Id = "container-1") => ({ Id, Labels });

describe("parseContainerLabels", () => {
  it("parses complete Homarr labels", () => {
    expect(
      parseContainerLabels(
        container({
          "homarr.name": "Sonarr",
          "homarr.group": "Media",
          "homarr.href": "http://sonarr:8989",
          "homarr.icon": "sonarr.svg",
          "homarr.description": "TV",
          "homarr.ping": "http://sonarr:8989/ping",
          "homarr.id": "sonarr-main",
          "homarr.board": "dashboard",
          "homarr.integration": "sonarr",
          "homarr.widget": "calendar",
        }),
        "socket",
      ),
    ).toEqual({
      sourceId: "docker:socket:sonarr-main",
      containerId: "container-1",
      host: "socket",
      group: "Media",
      name: "Sonarr",
      href: "http://sonarr:8989",
      icon: "sonarr.svg",
      description: "TV",
      pingUrl: "http://sonarr:8989/ping",
      externalId: "sonarr-main",
      boardName: "dashboard",
      integrationKind: "sonarr",
      widgetKind: "calendar",
    });
  });

  it("supports Homepage labels when Homarr labels are absent", () => {
    expect(
      parseContainerLabels(
        container({
          "homepage.name": "Jellyfin",
          "homepage.group": "Media",
          "homepage.href": "http://jellyfin:8096",
          "homepage.icon": "jellyfin.svg",
        }),
        "remote:2375",
      ),
    ).toMatchObject({
      sourceId: "docker:remote:2375:container-1",
      name: "Jellyfin",
      group: "Media",
      href: "http://jellyfin:8096",
      icon: "jellyfin.svg",
    });
  });

  it("keeps a labeled service without a group for root placement", () => {
    expect(
      parseContainerLabels(
        container({
          "homarr.name": "Status",
          "homarr.href": "http://status:3001",
          "homarr.widget": "clock",
        }),
        "socket",
      ),
    ).toMatchObject({ name: "Status", href: "http://status:3001", group: undefined, widgetKind: "clock" });
  });

  it("does not mix Homepage required fields into an explicitly Homarr-labeled service", () => {
    expect(
      parseContainerLabels(
        container({
          "homarr.name": "Sonarr",
          "homepage.group": "Media",
          "homepage.href": "http://sonarr:8989",
        }),
        "socket",
      ),
    ).toBeNull();
  });

  it("can disable Homepage fallback", () => {
    expect(
      parseContainerLabels(
        container({
          "homepage.name": "Sonarr",
          "homepage.group": "Media",
          "homepage.href": "http://sonarr:8989",
        }),
        "socket",
        { readHomepageLabels: false },
      ),
    ).toBeNull();
  });

  it("ignores hidden and incomplete containers", () => {
    expect(
      parseContainerLabels(
        container({
          "homarr.hide": "true",
          "homarr.name": "Sonarr",
          "homarr.group": "Media",
          "homarr.href": "http://sonarr:8989",
        }),
        "socket",
      ),
    ).toBeNull();
    expect(parseContainerLabels(container({ "homarr.name": "Sonarr" }), "socket")).toBeNull();
  });

  it("trims values and ignores invalid integration and widget kinds", () => {
    expect(
      parseContainerLabels(
        container({
          "homarr.name": " Sonarr ",
          "homarr.group": " Media ",
          "homarr.href": " http://sonarr:8989 ",
          "homarr.integration": "not-real",
          "homarr.widget": "not-real",
        }),
        "socket",
      ),
    ).toMatchObject({
      name: "Sonarr",
      group: "Media",
      href: "http://sonarr:8989",
      integrationKind: undefined,
      widgetKind: undefined,
    });
  });
});
