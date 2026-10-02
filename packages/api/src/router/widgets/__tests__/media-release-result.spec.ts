import { describe, expect, test } from "vitest";

import type { MediaRelease } from "@homarr/integrations/types";

import { PUBLIC_INTEGRATION_ERROR } from "../../../settle-integrations";
import { getMediaReleaseResponse } from "../media-release-result";

const integrations = [
  { id: "plex", name: "Living room Plex", kind: "plex" as const },
  { id: "jellyfin", name: "Family Jellyfin", kind: "jellyfin" as const },
];

const release: MediaRelease = {
  id: "shared-id",
  type: "movie",
  title: "Example release",
  releaseDate: new Date("2026-08-13T10:00:00Z"),
  imageUrls: { poster: undefined, backdrop: undefined },
  tags: [],
  href: "https://example.com/release",
};

describe("getMediaReleaseResponse", () => {
  test("keeps healthy releases and returns a sanitized failure envelope", async () => {
    const response = await getMediaReleaseResponse(integrations, async (integration) => {
      if (integration.id === "plex") throw new Error("token=secret at plex.internal");
      return { releases: [release], updatedAt: new Date("2026-08-13T11:00:00Z") };
    });

    expect(response.releases).toEqual([
      {
        ...release,
        integration: {
          ...integrations[1],
          updatedAt: new Date("2026-08-13T11:00:00Z"),
        },
      },
    ]);
    expect(response.failedIntegrations).toEqual([
      {
        integrationId: "plex",
        integrationName: "Living room Plex",
        error: PUBLIC_INTEGRATION_ERROR,
      },
    ]);
    expect(JSON.stringify(response)).not.toMatch(/secret|plex\.internal/i);
  });

  test("keeps source identity when integrations return the same release id", async () => {
    const response = await getMediaReleaseResponse(integrations, async () => ({
      releases: [release],
      updatedAt: new Date("2026-08-13T11:00:00Z"),
    }));

    expect(response.releases.map(({ integration }) => integration.id)).toEqual(["plex", "jellyfin"]);
  });

  test("throws when every integration fails", async () => {
    await expect(
      getMediaReleaseResponse(integrations, async () => {
        throw new Error("Unavailable");
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "All integration queries failed",
    });
  });
});
