import { stringify } from "superjson";
import { beforeEach, describe, expect, it } from "vitest";

import type { Session } from "@homarr/auth";
import { eq } from "@homarr/db";
import { boards, boardUserPermissions, integrations, integrationItems, items, users } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { requireFrameleafWidgetAsync } from "./access";

const albumId = "00000000-0000-4000-8000-000000000010";
let database: ReturnType<typeof createDb>;
const session = (id: string): Session => ({
  user: { id, name: id, email: null, image: null, colorScheme: "light", permissions: ["board-view-all"] },
  expires: new Date(Date.now() + 3600000).toISOString(),
});
beforeEach(async () => {
  database = createDb();
  await database.insert(users).values([
    { id: "owner", name: "Owner" },
    { id: "viewer", name: "Viewer" },
  ]);
  await database.insert(boards).values({ id: "private", name: "Private", isPublic: false, creatorId: "owner" });
  await database
    .insert(integrations)
    .values({ id: "library", name: "Library", kind: "frameleaf", url: "https://library.example.test" });
  await database.insert(items).values({
    id: "photo",
    boardId: "private",
    kind: "frameleaf-albumCarousel",
    options: stringify({ albumId }),
  });
  await database.insert(integrationItems).values({ itemId: "photo", integrationId: "library" });
});

describe("Frameleaf private widget boundary", () => {
  it("rejects anonymous viewers and global board permissions without explicit viewer access", async () => {
    await expect(requireFrameleafWidgetAsync(database, null, "photo")).rejects.toThrow();
    await expect(requireFrameleafWidgetAsync(database, session("viewer"), "photo")).rejects.toThrow();
  });
  it("permits the owner and explicit viewer, then immediately denies removed membership", async () => {
    expect(await requireFrameleafWidgetAsync(database, session("owner"), "photo")).toMatchObject({
      integrationId: "library",
      albumId,
    });
    await database.insert(boardUserPermissions).values({ boardId: "private", userId: "viewer", permission: "view" });
    expect(await requireFrameleafWidgetAsync(database, session("viewer"), "photo")).toMatchObject({
      integrationId: "library",
    });
    await database.delete(boardUserPermissions);
    await expect(requireFrameleafWidgetAsync(database, session("viewer"), "photo")).rejects.toThrow();
  });
  it("rejects public boards even for their owner", async () => {
    await database.update(boards).set({ isPublic: true }).where(eq(boards.id, "private"));
    await expect(requireFrameleafWidgetAsync(database, session("owner"), "photo")).rejects.toThrow();
  });
  it("takes the destination and grant only from the saved widget, rejecting other kinds and missing selections", async () => {
    await database.update(items).set({ options: stringify({ albumId: "" }) });
    await expect(requireFrameleafWidgetAsync(database, session("owner"), "photo")).rejects.toThrow();
    await database.update(items).set({ kind: "video", options: stringify({ albumId }) });
    await expect(requireFrameleafWidgetAsync(database, session("owner"), "photo")).rejects.toThrow();
  });
});
