import SuperJSON from "superjson";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { eq } from "@homarr/db";
import { boards, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

const mocks = vi.hoisted(() => ({ env: { CUSTOM_WIDGETS_ENABLED: true } }));
vi.mock("../../../env", () => ({ env: mocks.env }));

import { optionsRouter } from "../../widgets/options";

const createSession = (userId: string, isAdmin = false): Session => ({
  user: {
    id: userId,
    permissions: isAdmin ? ["admin"] : [],
    colorScheme: "light",
  },
  expires: new Date(Date.now() + 60_000).toISOString(),
});

async function setup(kind: "customApi" | "weather") {
  const db = createDb();
  const userId = createId();
  const boardId = createId();
  const itemId = createId();
  await db.insert(users).values({ id: userId });
  await db.insert(boards).values({ id: boardId, name: createId(), creatorId: userId });
  await db.insert(items).values({
    id: itemId,
    boardId,
    kind,
    options: SuperJSON.stringify(
      kind === "customApi"
        ? { definitionId: "definition-1", refreshInterval: 30, configuration: { server: "primary" } }
        : { location: "Paris" },
    ),
  });
  return { db, userId, boardId, itemId };
}

describe("saveItemOptions Custom Widget access", () => {
  beforeEach(() => {
    mocks.env.CUSTOM_WIDGETS_ENABLED = true;
  });

  test("rejects direct Custom Widget reconfiguration by a non-admin board modifier", async () => {
    const { db, userId, boardId, itemId } = await setup("customApi");
    const caller = optionsRouter.createCaller({ db, deviceType: undefined, session: createSession(userId) });

    await expect(
      caller.saveItemOptions({
        boardId,
        itemId,
        newOptions: {
          definitionId: "definition-2",
          refreshInterval: 1,
          configuration: { server: "attacker" },
        },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const stored = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(SuperJSON.parse(stored?.options ?? "")).toMatchObject({
      definitionId: "definition-1",
      refreshInterval: 30,
      configuration: { server: "primary" },
    });
  });

  test("allows a Homarr admin to reconfigure a Custom Widget placement", async () => {
    const { db, userId, boardId, itemId } = await setup("customApi");
    const caller = optionsRouter.createCaller({ db, deviceType: undefined, session: createSession(userId, true) });

    await expect(
      caller.saveItemOptions({ boardId, itemId, newOptions: { refreshInterval: 60 } }),
    ).resolves.toBeUndefined();

    const stored = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    expect(SuperJSON.parse(stored?.options ?? "")).toMatchObject({ refreshInterval: 60 });
  });

  test("rejects direct admin reconfiguration while the emergency switch is off", async () => {
    const { db, userId, boardId, itemId } = await setup("customApi");
    mocks.env.CUSTOM_WIDGETS_ENABLED = false;
    const caller = optionsRouter.createCaller({ db, deviceType: undefined, session: createSession(userId, true) });

    await expect(
      caller.saveItemOptions({ boardId, itemId, newOptions: { refreshInterval: 60 } }),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });

  test("allows normalized missing defaults without treating them as reconfiguration", async () => {
    const { db, userId, boardId, itemId } = await setup("customApi");
    const stored = await db.query.items.findFirst({ where: eq(items.id, itemId) });
    const options = SuperJSON.parse<Record<string, unknown>>(stored?.options ?? "");
    delete options.configuration;
    delete options.configurationVersion;
    await db
      .update(items)
      .set({ options: SuperJSON.stringify(options) })
      .where(eq(items.id, itemId));
    const caller = optionsRouter.createCaller({ db, deviceType: undefined, session: createSession(userId) });

    await expect(
      caller.saveItemOptions({
        boardId,
        itemId,
        newOptions: { configuration: {}, configurationVersion: 1 },
      }),
    ).resolves.toBeUndefined();
  });

  test("preserves ordinary board-modifier option updates for other widgets", async () => {
    const { db, userId, boardId, itemId } = await setup("weather");
    const caller = optionsRouter.createCaller({ db, deviceType: undefined, session: createSession(userId) });

    await expect(
      caller.saveItemOptions({ boardId, itemId, newOptions: { location: "Lyon" } }),
    ).resolves.toBeUndefined();
  });
});
