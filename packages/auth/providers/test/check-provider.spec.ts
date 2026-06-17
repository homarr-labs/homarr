import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SupportedAuthProvider } from "@homarr/definitions";

import * as env from "../../env";
import {
  canManageGroupMembersLocally,
  getGroupMemberManagementType,
  getLocallyManageableProviders,
  isGroupMembershipManagedLocally,
} from "../check-provider";

const mockEnv = (providers: SupportedAuthProvider[], oidcLocalManagement = false) => {
  vi.spyOn(env, "env", "get").mockReturnValue({
    AUTH_PROVIDERS: providers,
    AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT: oidcLocalManagement,
  } as never);
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("isGroupMembershipManagedLocally", () => {
  test("credentials is always managed locally", () => {
    mockEnv(["credentials"]);
    expect(isGroupMembershipManagedLocally("credentials")).toBe(true);
  });

  test("oidc follows AUTH_OIDC_GROUPS_LOCAL_MANAGEMENT", () => {
    mockEnv(["oidc"], true);
    expect(isGroupMembershipManagedLocally("oidc")).toBe(true);

    mockEnv(["oidc"], false);
    expect(isGroupMembershipManagedLocally("oidc")).toBe(false);
  });

  test("ldap is never managed locally", () => {
    mockEnv(["ldap"]);
    expect(isGroupMembershipManagedLocally("ldap")).toBe(false);
  });
});

describe("getGroupMemberManagementType", () => {
  test("credentials only is local", () => {
    mockEnv(["credentials"]);
    expect(getGroupMemberManagementType()).toBe("local");
  });

  test("credentials + oidc with local management is local", () => {
    mockEnv(["credentials", "oidc"], true);
    expect(getGroupMemberManagementType()).toBe("local");
  });

  test("credentials + oidc without local management is mixed", () => {
    mockEnv(["credentials", "oidc"], false);
    expect(getGroupMemberManagementType()).toBe("mixed");
  });

  test("credentials + ldap is mixed", () => {
    mockEnv(["credentials", "ldap"]);
    expect(getGroupMemberManagementType()).toBe("mixed");
  });

  test("ldap only is external", () => {
    mockEnv(["ldap"]);
    expect(getGroupMemberManagementType()).toBe("external");
  });

  test("oidc only without local management is external", () => {
    mockEnv(["oidc"], false);
    expect(getGroupMemberManagementType()).toBe("external");
  });
});

describe("getLocallyManageableProviders", () => {
  test("returns only the enabled, locally managed providers", () => {
    mockEnv(["credentials", "oidc", "ldap"], true);
    expect(getLocallyManageableProviders()).toEqual(["credentials", "oidc"]);

    mockEnv(["credentials", "oidc", "ldap"], false);
    expect(getLocallyManageableProviders()).toEqual(["credentials"]);

    mockEnv(["ldap"]);
    expect(getLocallyManageableProviders()).toEqual([]);
  });
});

describe("canManageGroupMembersLocally", () => {
  test("is true when at least one enabled provider is managed locally", () => {
    mockEnv(["credentials", "ldap"]);
    expect(canManageGroupMembersLocally()).toBe(true);

    mockEnv(["oidc"], true);
    expect(canManageGroupMembersLocally()).toBe(true);
  });

  test("is false when every enabled provider is external", () => {
    mockEnv(["ldap"]);
    expect(canManageGroupMembersLocally()).toBe(false);

    mockEnv(["oidc"], false);
    expect(canManageGroupMembersLocally()).toBe(false);
  });
});
