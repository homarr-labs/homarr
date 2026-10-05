import { describe, expect, it } from "vitest";

import type { Session } from "@homarr/auth";
import { groups, groupPermissions, onboarding } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { groupRouter } from "../group";

const adminSession = {
  user: { id: "admin", permissions: ["admin"], colorScheme: "light" },
  expires: new Date().toISOString(),
} satisfies Session;

describe("group.createInitialExternalGroup", () => {
  it("commits exactly one concurrent group-to-setup transition", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "group", previousStep: "start" });
    const caller = groupRouter.createCaller({ db, deviceType: undefined, session: adminSession });

    const results = await Promise.allSettled([
      caller.createInitialExternalGroup({ name: "LDAP admins" }),
      caller.createInitialExternalGroup({ name: "OIDC admins" }),
    ]);

    expect(results.map((result) => result.status).toSorted()).toEqual(["fulfilled", "rejected"]);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({
      reason: expect.objectContaining({ message: "The initial external group was already created." }),
    });
    const createdGroups = await db.select().from(groups);
    expect(createdGroups).toHaveLength(1);
    expect(["LDAP admins", "OIDC admins"]).toContain(createdGroups[0]?.name);
    expect(await db.select().from(groupPermissions)).toEqual([
      expect.objectContaining({ groupId: createdGroups[0]?.id, permission: "admin" }),
    ]);
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });
  });
});
