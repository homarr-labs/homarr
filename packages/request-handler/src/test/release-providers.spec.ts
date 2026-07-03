import { beforeEach, describe, expect, test, vi } from "vitest";
import { Response } from "undici";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import { getLatestMatchingReleaseAsync } from "../release-providers";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));
vi.mock("@homarr/core/infrastructure/logs", () => ({
  createLogger: () => ({
    warn: vi.fn(),
  }),
}));

const mockedFetch = vi.mocked(fetchWithTrustedCertificatesAsync);

describe("getLatestMatchingReleaseAsync for GitHub Container Registry", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test("normalizes full image refs and returns latest from anonymous OCI registry metadata", async () => {
    mockGhcrResponses({
      repositoryName: "homarr-labs/homarr",
      tags: ["v1.0.0", "latest"],
      createdAtByTag: {
        latest: "2026-06-19T20:30:59.853Z",
      },
    });

    const result = await getLatestMatchingReleaseAsync({
      id: "homarr",
      provider: "gitHubContainerRegistry",
      identifier: "ghcr.io/homarr-labs/homarr:latest",
    });

    expect(result).toEqual({
      success: true,
      data: {
        projectUrl: "https://github.com/homarr-labs/homarr",
        latestRelease: "latest",
        latestReleaseAt: new Date("2026-06-19T20:30:59.853Z"),
        releaseUrl: "https://github.com/homarr-labs/homarr/pkgs/container/homarr",
      },
    });
    expectUrl(0, "https://ghcr.io/token");
    expect(new URL(mockedFetch.mock.calls[0]?.[0].toString() ?? "").searchParams.get("service")).toBe("ghcr.io");
    expect(new URL(mockedFetch.mock.calls[0]?.[0].toString() ?? "").searchParams.get("scope")).toBe(
      "repository:homarr-labs/homarr:pull",
    );
  });

  test("uses custom registry base URL for GHCR-compatible registries", async () => {
    mockGhcrResponses({
      registryOrigin: "https://registry.example.com",
      repositoryName: "homarr-labs/homarr",
      tags: ["latest"],
      createdAtByTag: {
        latest: "2026-06-19T20:30:59.853Z",
      },
    });

    await getLatestMatchingReleaseAsync({
      id: "homarr",
      provider: "gitHubContainerRegistry",
      identifier: "homarr-labs/homarr",
      providerUrl: "https://registry.example.com/",
    });

    expectUrl(0, "https://registry.example.com/token");
    expect(new URL(mockedFetch.mock.calls[0]?.[0].toString() ?? "").searchParams.get("service")).toBe(
      "registry.example.com",
    );
    expectUrl(1, "https://registry.example.com/v2/homarr-labs/homarr/tags/list");
  });

  test("chooses the newest matching version tag", async () => {
    mockGhcrResponses({
      repositoryName: "muchobien/pocketbase",
      tags: ["0.22.0", "0.23.0", "latest"],
      createdAtByTag: {
        "0.22.0": "2026-01-01T00:00:00.000Z",
        "0.23.0": "2026-02-01T00:00:00.000Z",
      },
    });

    const result = await getLatestMatchingReleaseAsync({
      id: "pocketbase",
      provider: "gitHubContainerRegistry",
      identifier: "ghcr.io/muchobien/pocketbase:latest",
      versionRegex: "^0\\.[0-9]+\\.[0-9]+$",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.latestRelease).toBe("0.23.0");
    expect(result.data.latestReleaseAt).toEqual(new Date("2026-02-01T00:00:00.000Z"));
  });

  test("returns invalidIdentifier for missing package name", async () => {
    const result = await getLatestMatchingReleaseAsync({
      id: "invalid",
      provider: "gitHubContainerRegistry",
      identifier: "ghcr.io/homarr-labs",
    });

    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ code: "invalidIdentifier" }),
    });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test("returns unexpected with provider error message", async () => {
    mockedFetch.mockResolvedValueOnce(createJsonResponse({ errors: [] }, { status: 500, statusText: "Registry down" }));

    const result = await getLatestMatchingReleaseAsync({
      id: "homarr",
      provider: "gitHubContainerRegistry",
      identifier: "homarr-labs/homarr",
    });

    expect(result).toEqual({ success: false, error: { code: "unexpected", message: "Registry down" } });
  });
});

interface MockGhcrResponsesInput {
  registryOrigin?: string;
  repositoryName: string;
  tags: string[];
  createdAtByTag: Record<string, string>;
}

const mockGhcrResponses = ({
  registryOrigin = "https://ghcr.io",
  repositoryName,
  tags,
  createdAtByTag,
}: MockGhcrResponsesInput) => {
  mockedFetch.mockImplementation(async (input) => {
    const url = new URL(input.toString());
    const path = url.pathname;

    if (url.origin !== registryOrigin) {
      return createJsonResponse({ error: "unexpected origin" }, { status: 404, statusText: "Not Found" });
    }

    if (path === "/token") return createJsonResponse({ token: "token" });
    if (path === `/v2/${repositoryName}/tags/list`) return createJsonResponse({ name: repositoryName, tags });

    const manifestMatch = new RegExp(`^/v2/${escapeRegExp(repositoryName)}/manifests/(.+)$`).exec(path);
    if (manifestMatch) {
      const reference = decodeURIComponent(manifestMatch[1] ?? "");
      if (reference.startsWith("sha256:")) {
        return createJsonResponse({ config: { digest: `sha256:config-${reference.slice("sha256:".length)}` } });
      }
      return createJsonResponse({
        manifests: [{ digest: `sha256:${reference}` }],
      });
    }

    const blobMatch = new RegExp(`^/v2/${escapeRegExp(repositoryName)}/blobs/sha256:config-(.+)$`).exec(path);
    if (blobMatch) {
      const tag = decodeURIComponent(blobMatch[1] ?? "");
      return createJsonResponse({ created: createdAtByTag[tag] ?? "2026-01-01T00:00:00.000Z" });
    }

    return createJsonResponse({ error: "not found" }, { status: 404, statusText: "Not Found" });
  });
};

interface JsonResponseInit {
  status?: number;
  statusText?: string;
}

const createJsonResponse = (body: unknown, init: JsonResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    statusText: init.statusText,
    headers: {
      "content-type": "application/json",
    },
  });

const expectUrl = (callIndex: number, expectedUrl: string) => {
  expect(mockedFetch.mock.calls[callIndex]?.[0].toString().split("?")[0]).toBe(expectedUrl);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
