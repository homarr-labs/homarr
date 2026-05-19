import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { Octokit } from "octokit";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { getAvailableUpdatesAsync } from "../update-checker";

const mockEnv = vi.hoisted(() => ({
  NO_EXTERNAL_CONNECTION: false,
}));

vi.mock("@homarr/common/env", () => ({
  env: mockEnv,
}));

vi.mock("octokit", () => {
  const mockOctokit = {
    rest: {
      repos: {
        listReleases: vi.fn(),
      },
    },
  };
  return {
    Octokit: class {
      rest = mockOctokit.rest;
    },
  };
});

describe("getAvailableUpdatesAsync", () => {
  beforeEach(() => {
    mockEnv.NO_EXTERNAL_CONNECTION = false;
  });

  test("should return available non pre-release updates", async () => {
    // Arrange
    const currentVersion = "v1.2.3";
    const releases = fakeReleasesWithPrereleases();
    const listReleasesSpy = vi.spyOn(new Octokit().rest.repos, "listReleases");
    listReleasesSpy.mockReturnValue(Promise.resolve({ data: releases, status: 200, headers: {}, url: "" }));

    // Act
    const result = await getAvailableUpdatesAsync(currentVersion);

    // Assert
    expect(result.map((update) => update.tagName)).toEqual(["v1.3.0", "v1.2.4"]);
    expect(listReleasesSpy).toHaveBeenCalledWith({
      owner: "homarr-labs",
      repo: "homarr",
    });
  });

  test("should return all available updates", async () => {
    // Arrange
    const currentVersion = "v1.2.4-beta.2";
    const releases = fakeReleasesWithPrereleases();
    const listReleasesSpy = vi.spyOn(new Octokit().rest.repos, "listReleases");
    listReleasesSpy.mockReturnValue(Promise.resolve({ data: releases, status: 200, headers: {}, url: "" }));

    // Act
    const result = await getAvailableUpdatesAsync(currentVersion);

    // Assert
    expect(result.map((update) => update.tagName)).toEqual([
      "v1.3.1-beta.1",
      "v1.3.0",
      "v1.3.0-beta.1",
      "v1.2.4",
      "v1.2.4-beta.3",
    ]);
    expect(listReleasesSpy).toHaveBeenCalledWith({
      owner: "homarr-labs",
      repo: "homarr",
      query: undefined,
    });
  });

  test("should skip releases with invalid semver tags", async () => {
    // Arrange
    const currentVersion = "v1.2.3";
    const releases = fakeReleases(["v1.2.4", false], ["invalid-tag", false], ["v1.3.0", false]);
    const listReleasesSpy = vi.spyOn(new Octokit().rest.repos, "listReleases");
    listReleasesSpy.mockReturnValue(Promise.resolve({ data: releases, status: 200, headers: {}, url: "" }));

    // Act
    const result = await getAvailableUpdatesAsync(currentVersion);

    // Assert
    expect(result.map((update) => update.tagName)).toEqual(["v1.3.0", "v1.2.4"]);
  });

  test("should throw error for invalid current version", async () => {
    // Arrange
    const currentVersion = "invalid-version";

    // Act
    const act = () => getAvailableUpdatesAsync(currentVersion);

    // Assert
    await expect(act()).rejects.toThrow("non semantic current version");
  });

  test("should return empty array when NO_EXTERNAL_CONNECTION=true", async () => {
    // Arrange
    mockEnv.NO_EXTERNAL_CONNECTION = true;
    const currentVersion = "v1.0.0";

    // Act
    const result = await getAvailableUpdatesAsync(currentVersion);

    // Assert
    expect(result).toEqual([]);
  });
});

const fakeReleases = (...inputs: [string, boolean][]) => inputs.map(fakeRelease);
const fakeRelease = ([tagName, isPrerelease]: [string, boolean]) =>
  ({
    tag_name: tagName,
    html_url: `https://github.com/homarr-labs/homarr/releases/tag/${tagName}`,
    name: tagName,
    body_html: undefined,
    prerelease: isPrerelease,
  }) as RestEndpointMethodTypes["repos"]["listReleases"]["response"]["data"][number];

const fakeReleasesWithPrereleases = () =>
  fakeReleases(
    ["v1.1.0", false],
    ["v1.2.2", false],
    ["v1.2.3", false],
    ["v1.2.4-beta.1", true],
    ["v1.2.4-beta.2", true],
    ["v1.2.4-beta.3", true],
    ["v1.2.4", false],
    ["v1.3.0-beta.1", true],
    ["v1.3.0", false],
    ["v1.3.1-beta.1", true],
  );
