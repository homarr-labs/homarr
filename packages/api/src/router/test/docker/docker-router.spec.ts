import { TRPCError } from "@trpc/server";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { objectKeys } from "@homarr/common";
import type { Database } from "@homarr/db";
import { getPermissionsWithChildren } from "@homarr/definitions";
import type { GroupPermissionKey } from "@homarr/definitions";

import type { RouterInputs } from "../../..";
import { dockerRouter } from "../../docker/docker-router";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));
vi.mock("@homarr/redis", () => ({
  createCacheChannel: () => ({
    // eslint-disable-next-line @typescript-eslint/require-await
    consumeAsync: async () => ({
      timestamp: new Date().toISOString(),
      data: { containers: [] },
    }),
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    invalidateAsync: async () => {},
  }),
}));

const createSessionWithPermissions = (...permissions: GroupPermissionKey[]) =>
  ({
    user: {
      id: "1",
      permissions,
      colorScheme: "light",
    },
    expires: new Date().toISOString(),
  }) satisfies Session;

const procedureKeys = objectKeys(dockerRouter._def.procedures);

const validInputs: {
  [key in (typeof procedureKeys)[number]]: RouterInputs["docker"][key];
} = {
  getContainers: undefined,
  startAll: { ids: ["1"] },
  stopAll: { ids: ["1"] },
  restartAll: { ids: ["1"] },
  removeAll: { ids: ["1"] },
  invalidate: undefined,
};

describe("All procedures should only be accessible for users with admin permission", () => {
  test.each(procedureKeys)("Procedure %s should be accessible for users with admin permission", async (procedure) => {
    // Arrange
    const caller = dockerRouter.createCaller({
      db: null as unknown as Database,
      session: createSessionWithPermissions("admin"),
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).resolves.not.toThrow();
  });

  test.each(procedureKeys)("Procedure %s should not be accessible with other permissions", async (procedure) => {
    // Arrange
    const groupPermissionsWithoutAdmin = getPermissionsWithChildren(["admin"]).filter(
      (permission) => permission !== "admin",
    );
    const caller = dockerRouter.createCaller({
      db: null as unknown as Database,
      session: createSessionWithPermissions(...groupPermissionsWithoutAdmin),
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Permission denied" }));
  });

  test.each(procedureKeys)("Procedure %s should not be accessible without session", async (procedure) => {
    // Arrange
    const caller = dockerRouter.createCaller({
      db: null as unknown as Database,
      session: null,
    });

    // Act
    const act = () => caller[procedure](validInputs[procedure] as never);

    await expect(act()).rejects.toThrow(new TRPCError({ code: "UNAUTHORIZED" }));
  });
});
