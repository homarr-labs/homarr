import { describe, expect, test } from "vitest";

import { getTraefikProtocolKeys, getTraefikSourceDetails, getVisibleTraefikEntryPoints } from "./component";

const emptyProtocol = {
  routers: { total: 0, enabled: 0, warnings: 0, errors: 0 },
  services: { total: 0, enabled: 0, warnings: 0, errors: 0 },
  middlewares: { total: 0, enabled: 0, warnings: 0, errors: 0 },
};

describe("Traefik source ownership", () => {
  test("scopes identical resource and endpoint keys to their integrations", () => {
    const dashboard = {
      version: "3.0",
      entryPoints: [],
      resources: [
        { protocol: "http" as const, type: "router" as const, name: "api", provider: null, status: "enabled" as const },
      ],
      failedEndpoints: ["/api/http/services"],
      http: emptyProtocol,
      tcp: emptyProtocol,
      udp: { routers: emptyProtocol.routers, services: emptyProtocol.services },
    };

    const details = getTraefikSourceDetails([
      { integrationId: "traefik-a", integrationName: "Traefik A", dashboard },
      { integrationId: "traefik-b", integrationName: "Traefik B", dashboard },
    ]);

    expect(details.resources.map(({ key }) => key)).toEqual([
      "traefik-a:http:router:api:0",
      "traefik-b:http:router:api:0",
    ]);
    expect(details.failedEndpoints.map(({ key }) => key)).toEqual([
      "traefik-a:/api/http/services:0",
      "traefik-b:/api/http/services:0",
    ]);
  });
});

describe("Traefik advanced disclosure", () => {
  test("shows every protocol in advanced mode regardless of compact toggles", () => {
    expect(getTraefikProtocolKeys({ showTcp: false, showUdp: false }, true)).toEqual(["http", "tcp", "udp"]);
  });

  test("shows every unique entry point regardless of compact width limits", () => {
    const entryPoints = ["web", "websecure", "metrics", "admin", "postgres", "dns", "ssh", "smtp", "web"];

    expect(getVisibleTraefikEntryPoints(entryPoints, 100, true)).toEqual(entryPoints.slice(0, -1));
    expect(getVisibleTraefikEntryPoints(entryPoints, 100, false)).toEqual(["web", "websecure"]);
  });
});
