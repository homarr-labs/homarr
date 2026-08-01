import { stringify } from "superjson";
import { describe, expect, it } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, sectionCollapseStates, sections, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { sectionRouter } from "../section/section-router";

const userId = createId();
const session = {
  user: {
    id: userId,
    permissions: [],
    colorScheme: "light",
  },
  expires: new Date().toISOString(),
} satisfies Session;

const createCallerAsync = async () => {
  const db = createDb();
  const boardId = createId();

  await db.insert(users).values({ id: userId });
  await db.insert(boards).values({
    id: boardId,
    name: createId(),
    creatorId: userId,
  });

  return {
    boardId,
    db,
    caller: sectionRouter.createCaller({
      db,
      deviceType: undefined,
      session,
    }),
  };
};

describe("changeCollapsed", () => {
  it("rejects a root section", async () => {
    const { boardId, caller, db } = await createCallerAsync();
    const sectionId = createId();
    await db.insert(sections).values({
      id: sectionId,
      boardId,
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
    });

    await expect(caller.changeCollapsed({ sectionId, collapsed: true })).rejects.toThrow("Section cannot be collapsed");
  });

  it("creates and updates collapse state for an enabled container", async () => {
    const { boardId, caller, db } = await createCallerAsync();
    const sectionId = createId();
    await db.insert(sections).values({
      id: sectionId,
      boardId,
      kind: "container",
      options: stringify({ collapsible: true }),
    });

    await caller.changeCollapsed({ sectionId, collapsed: true });
    await caller.changeCollapsed({ sectionId, collapsed: false });

    const states = await db.query.sectionCollapseStates.findMany({
      where: eq(sectionCollapseStates.sectionId, sectionId),
    });
    expect(states).toHaveLength(1);
    expect(states[0]?.collapsed).toBe(false);
  });

  it("rejects a container when collapsing is disabled", async () => {
    const { boardId, caller, db } = await createCallerAsync();
    const sectionId = createId();
    await db.insert(sections).values({
      id: sectionId,
      boardId,
      kind: "container",
    });

    await expect(caller.changeCollapsed({ sectionId, collapsed: true })).rejects.toThrow("Section cannot be collapsed");
  });
});
