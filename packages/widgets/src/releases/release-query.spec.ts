import { httpBatchStreamLink } from "@trpc/client";
import superjson, { serialize } from "superjson";
import { describe, expect, test } from "vitest";

import { missingReleaseResultError, toReleaseQueryRepository } from "./release-query";
import type { ReleaseQueryRepository } from "./release-query";

const trpcMaxUrlLength = 2083;
const trpcUrl = "https://homarr.example.com/api/trpc";

const ghcrIdentifiers = [
  "homarr-labs/homarr",
  "d3x/d3x",
  "cross-seed/cross-seed",
  "santiagosayshey/profilarr",
  "maintainerr/maintainerr",
];

const dockerHubIdentifiers = [
  "cloudflare/cloudflared",
  "tailscale/tailscale",
  "tugtainer/tugtainer",
  "amir20/dozzle",
  "filebrowser/filebrowser",
];

const idFor = (prefix: string, index: number) => `${prefix}${String(index).padStart(20, "0")}`;

interface CapturedReleaseRequest {
  url?: string;
  method?: string;
  error?: { message: string };
}

const legacyReleaseInput = (provider: ReleaseQueryRepository["provider"], identifiers: string[]) => ({
  itemId: idFor("item", 1),
  boardId: idFor("board", 1),
  repositories: identifiers.map((identifier, index) => ({
    id: idFor("repo", index),
    provider,
    identifier,
    versionFilter: undefined,
    excludePrereleases: undefined,
    providerUrl: undefined,
  })),
});

const fixedReleaseInput = (provider: ReleaseQueryRepository["provider"], identifiers: string[]) => ({
  itemId: idFor("item", 1),
  boardId: idFor("board", 1),
  repositories: identifiers.map((identifier, index) =>
    toReleaseQueryRepository({
      id: idFor("repo", index),
      provider,
      identifier,
      versionFilter: undefined,
      excludePrereleases: undefined,
      providerUrl: undefined,
    }),
  ),
});

const dispatchReleaseLookup = (input: unknown) =>
  new Promise<CapturedReleaseRequest>((resolve) => {
    let captured: Pick<CapturedReleaseRequest, "url" | "method"> = {};
    const link = httpBatchStreamLink({
      url: trpcUrl,
      transformer: superjson,
      maxURLLength: trpcMaxUrlLength,
      fetch: (url, init) => {
        captured = { url: String(url), method: init?.method ?? "GET" };
        return Promise.resolve(
          new Response(JSON.stringify({ error: { message: "stop", code: -32600, data: {} } }), {
            status: 500,
            headers: { "content-type": "application/json" },
          }),
        );
      },
    })({} as never);

    link({
      op: {
        id: 1,
        type: "query",
        path: "widget.releases.getLatest",
        input,
        context: {},
        signal: undefined,
      },
      next: () => {
        throw new Error("release lookup should not call the next link");
      },
    }).subscribe({
      error: (error: { message: string }) => resolve({ ...captured, error }),
      complete: () => resolve(captured),
    });
  });

describe("toReleaseQueryRepository", () => {
  test("sends an explicit prerelease flag and drops unset registry options", () => {
    const query = toReleaseQueryRepository({
      id: "repo",
      provider: "gitHubContainerRegistry",
      identifier: "homarr-labs/homarr",
      excludePrereleases: undefined,
      versionFilter: undefined,
      providerUrl: undefined,
    });

    expect(query).toEqual({
      id: "repo",
      provider: "gitHubContainerRegistry",
      identifier: "homarr-labs/homarr",
      excludePrereleases: false,
    });
    expect(serialize(query).meta).toBeUndefined();
  });

  test("keeps a configured version filter and provider URL without empty parts", () => {
    expect(
      toReleaseQueryRepository({
        id: "repo",
        provider: "dockerHub",
        identifier: "library/postgres",
        excludePrereleases: true,
        versionFilter: { prefix: "", precision: 2, suffix: "alpine" },
        providerUrl: "https://hub.docker.com",
      }),
    ).toEqual({
      id: "repo",
      provider: "dockerHub",
      identifier: "library/postgres",
      excludePrereleases: true,
      versionFilter: { precision: 2, suffix: "alpine" },
      providerUrl: "https://hub.docker.com",
    });
  });
});

describe("missingReleaseResultError", () => {
  test("reports a failed batch separately from a provider that returned nothing", () => {
    expect(missingReleaseResultError(true)).toBe("unexpected");
    expect(missingReleaseResultError(false)).toBe("noProviderResponse");
  });
});

describe("release lookup transport", () => {
  test.each([
    ["gitHubContainerRegistry", ghcrIdentifiers],
    ["dockerHub", dockerHubIdentifiers],
  ] as const)("rejects a legacy %s batch before it is sent", async (provider, identifiers) => {
    const result = await dispatchReleaseLookup(legacyReleaseInput(provider, identifiers));

    expect(result.url).toBeUndefined();
    expect(result.error?.message).toContain("Input is too big for a single dispatch");
  });

  test.each([
    ["gitHubContainerRegistry", ghcrIdentifiers],
    ["dockerHub", dockerHubIdentifiers],
  ] as const)("sends a %s batch of five images under the URL limit", async (provider, identifiers) => {
    const result = await dispatchReleaseLookup(fixedReleaseInput(provider, identifiers));

    expect(result.url).toBeDefined();
    expect(result.method).toBe("GET");
    expect(result.url?.length).toBeLessThanOrEqual(trpcMaxUrlLength);
    expect(result.url).toContain(encodeURIComponent(identifiers[0] ?? ""));

    const input = new URL(result.url ?? "").searchParams.get("input");
    expect(input).toBeTruthy();
    const serialized = JSON.parse(input ?? "") as { 0: { meta?: unknown } };
    expect(serialized[0].meta).toBeUndefined();
  });
});
