import { beforeEach, describe, expect, test, vi } from "vitest";

import { releaseProviderKinds } from "@homarr/definitions";

import { expectFailure, mockedFetch, serveProvider } from "./provider-server";

vi.mock("@homarr/core/infrastructure/http", () => ({ fetchWithTrustedCertificatesAsync: vi.fn() }));
vi.mock("@homarr/core/infrastructure/logs", () => ({ createLogger: () => ({ warn: vi.fn() }) }));

describe("release lookup", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  test.each(releaseProviderKinds)("rejects an invalid version pattern for %s before any request", async (provider) => {
    const error = await expectFailure({ provider, identifier: "owner/repository", versionRegex: "^v(1" });

    expect(error).toEqual({ code: "noMatchingVersion", message: "Invalid regex: /^v(1/" });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test.each(releaseProviderKinds)("rejects an empty identifier for %s before any request", async (provider) => {
    const error = await expectFailure({ provider, identifier: "   " });

    expect(error.code).toBe("invalidIdentifier");
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  test.each(releaseProviderKinds)("reports a network failure for %s as unexpected", async (provider) => {
    mockedFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));

    const error = await expectFailure({ provider, identifier: "owner/repository" });

    expect(error.code).toBe("unexpected");
    expect(error.message).toContain("ECONNREFUSED");
  });

  test.each(releaseProviderKinds)("reports a malformed response for %s as unexpected", async (provider) => {
    serveProvider(() => ({ body: { unexpected: true } }));

    const error = await expectFailure({ provider, identifier: "owner/repository" });

    expect(error.code).toBe("unexpected");
  });
});
