import { describe, expect, it } from "vitest";

import { findIncompleteSetupConnection, getSetupCompletionBlock } from "./setup-completion";

const plex = { sourceId: "docker:plex", name: "plex", selected: true, url: "" };
const sonarr = { name: "sonarr", url: "http://sonarr:8989", secrets: [{ value: "" }] };

describe("getSetupCompletionBlock", () => {
  it("names a selected Docker app that still has no address", () => {
    expect(
      getSetupCompletionBlock({
        hasSelectedServices: true,
        serverAddressReviewed: true,
        apps: [plex, { sourceId: "docker:ignored", name: "ignored", selected: false, url: "" }],
        integrations: [],
      }),
    ).toEqual({ kind: "app-address", sourceId: "docker:plex", name: "plex" });
  });

  it("treats a blank app address as missing even when the server address is also unconfirmed", () => {
    expect(
      getSetupCompletionBlock({
        hasSelectedServices: true,
        serverAddressReviewed: false,
        apps: [{ ...plex, url: "   " }],
        integrations: [sonarr],
      }),
    ).toEqual({ kind: "app-address", sourceId: "docker:plex", name: "plex" });
  });

  it("names an integration that is missing an address or credential after app addresses are present", () => {
    expect(findIncompleteSetupConnection([{ ...plex, url: "http://plex:32400" }], [sonarr])).toEqual({
      kind: "integration",
      name: "sonarr",
    });
  });

  it("asks for the server address when Docker services are selected and nothing else is incomplete", () => {
    expect(
      getSetupCompletionBlock({
        hasSelectedServices: true,
        serverAddressReviewed: false,
        apps: [{ ...plex, url: "http://plex:32400" }],
        integrations: [{ ...sonarr, secrets: [{ value: "key" }] }],
      }),
    ).toEqual({ kind: "server-address" });
  });

  it("allows board creation when selected Docker services have the details they need", () => {
    expect(
      getSetupCompletionBlock({
        hasSelectedServices: true,
        serverAddressReviewed: true,
        apps: [{ ...plex, url: "http://plex:32400" }],
        integrations: [{ ...sonarr, secrets: [{ value: "key" }] }],
      }),
    ).toBeNull();
  });
});
