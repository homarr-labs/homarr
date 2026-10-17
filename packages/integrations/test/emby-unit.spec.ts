// @vitest-environment node

import { describe, expect, test, vi } from "vitest";

import { createDb } from "@homarr/db/test";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { EmbyIntegration } from "../src/emby/emby-integration";

vi.mock("@homarr/db", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/db")>();
  return { ...actual, db: createDb() };
});

vi.mock("@homarr/core/infrastructure/certificates", async (importActual) => {
  const actual = await importActual<typeof import("@homarr/core/infrastructure/certificates")>();
  return {
    ...actual,
    getTrustedCertificateHostnamesAsync: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const mockFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

const integrationInput = {
  id: "test-emby",
  name: "Emby",
  url: "http://localhost:8096",
  decryptedSecrets: [{ kind: "apiKey" as const, value: "test-key" }],
  externalUrl: null,
};

const latestItem = (id: string, extra: Record<string, unknown>) => ({
  Id: id,
  ServerId: "server-1",
  Name: `Item ${id}`,
  Taglines: [],
  DateCreated: "2026-10-01T00:00:00Z",
  Genres: [],
  Type: "Movie",
  ...extra,
});

describe("EmbyIntegration media releases", () => {
  test("returns items whose RunTimeTicks is missing or null", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ Id: "user-1", Name: "admin" }]) } as never)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            latestItem("with-runtime", { RunTimeTicks: 72000000000 }),
            latestItem("missing-runtime", {}),
            latestItem("null-runtime", { RunTimeTicks: null }),
          ]),
      } as never);

    const integration = new EmbyIntegration(integrationInput);
    const releases = await integration.getMediaReleasesAsync();

    expect(releases.map((release) => release.id)).toEqual(["with-runtime", "missing-runtime", "null-runtime"]);
  });
});
