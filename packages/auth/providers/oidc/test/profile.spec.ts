import type { Profile } from "@auth/core/types";
import { afterEach, describe, expect, test, vi } from "vitest";

const mockEnv = vi.hoisted(() => ({
  AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE: undefined as string | undefined,
}));

vi.mock("../../../env", () => ({ env: mockEnv }));

import { extractProfileName, getProfileValueByPath } from "../profile";

afterEach(() => {
  mockEnv.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE = undefined;
});

describe("getProfileValueByPath", () => {
  const profile = {
    sub: "user-id",
    resource_access: {
      homarr: {
        roles: ["admins"],
      },
    },
  } satisfies Profile;

  test("returns a top-level claim", () => {
    expect(getProfileValueByPath(profile, "sub")).toBe("user-id");
  });

  test("returns a nested claim", () => {
    expect(getProfileValueByPath(profile, "resource_access.homarr.roles")).toEqual(["admins"]);
  });

  test("returns undefined when the path does not exist", () => {
    expect(getProfileValueByPath(profile, "resource_access.missing.roles")).toBeUndefined();
  });
});

describe("extractProfileName", () => {
  test("uses preferred_username when overwrite is not set", () => {
    const profile = {
      sub: "user-id",
      preferred_username: "johndoe",
    } satisfies Profile;

    expect(extractProfileName(profile)).toBe("johndoe");
  });

  test("uses name when preferred_username is an email", () => {
    const profile = {
      sub: "user-id",
      preferred_username: "john@example.com",
      name: "John Doe",
    } satisfies Profile;

    expect(extractProfileName(profile)).toBe("John Doe");
  });

  test("returns undefined when the fallback name is null", () => {
    const profile = {
      sub: "user-id",
      preferred_username: "john@example.com",
      name: null,
    } satisfies Profile;

    expect(extractProfileName(profile)).toBeUndefined();
  });

  test("returns undefined when preferred_username is missing", () => {
    const profile = {
      sub: "user-id",
    } satisfies Profile;

    expect(extractProfileName(profile)).toBeUndefined();
  });

  test("uses a nested name claim when configured", () => {
    mockEnv.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE = "user.profile.display_name";
    const profile = {
      sub: "user-id",
      user: { profile: { display_name: "Nested User" } },
    } satisfies Profile;

    expect(extractProfileName(profile)).toBe("Nested User");
  });

  test("returns undefined when the configured claim is not a string", () => {
    mockEnv.AUTH_OIDC_NAME_ATTRIBUTE_OVERWRITE = "user.profile";
    const profile = {
      sub: "user-id",
      user: { profile: { display_name: "Nested User" } },
    } satisfies Profile;

    expect(extractProfileName(profile)).toBeUndefined();
  });
});
