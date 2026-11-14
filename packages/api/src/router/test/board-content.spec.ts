// @vitest-environment node

import { TRPCError } from "@trpc/server";
import { stringify } from "superjson";
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import type { Database } from "@homarr/db";
import {
  boards,
  boardUserPermissions,
  integrationItems,
  integrations,
  integrationUserPermissions,
  itemLayouts,
  items,
  layouts,
  sectionCollapseStates,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { boardRouter } from "../board";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const createSession = (userId: string, permissions: Session["user"]["permissions"] = []) =>
  ({
    user: { id: userId, permissions, colorScheme: "light" },
    expires: new Date().toISOString(),
  }) satisfies Session;

const mediaAdvancedOptions = { title: "Now playing", customCssClasses: ["wide"], borderColor: "#ff0000" };

const createBoardWithContentAsync = async () => {
  const db = createDb();
  const userId = createId();
  await db.insert(users).values({ id: userId });

  const boardId = createId();
  await db.insert(boards).values({ id: boardId, name: "content", creatorId: userId });
  const mobileLayoutId = createId();
  const baseLayoutId = createId();
  await db.insert(layouts).values([
    { id: mobileLayoutId, name: "Mobile", columnCount: 3, breakpoint: 0, role: "mobile", boardId },
    { id: baseLayoutId, name: "Base", columnCount: 12, breakpoint: 768, role: "base", boardId },
  ]);

  const rootSectionId = createId();
  const containerId = createId();
  await db.insert(sections).values([
    { id: rootSectionId, kind: "empty", xOffset: 0, yOffset: 0, boardId },
    {
      id: containerId,
      kind: "container",
      options: stringify({ title: "Media", collapsible: true }),
      boardId,
    },
  ]);
  await db.insert(sectionLayouts).values(
    [mobileLayoutId, baseLayoutId].map((layoutId) => ({
      sectionId: containerId,
      parentSectionId: rootSectionId,
      layoutId,
      xOffset: 0,
      yOffset: 1,
      width: 3,
      height: 2,
    })),
  );
  await db.insert(sectionCollapseStates).values({ userId, sectionId: containerId, collapsed: true });

  const integrationId = createId();
  const otherIntegrationId = createId();
  await db.insert(integrations).values([
    { id: integrationId, name: "Plex", kind: "plex", url: "https://plex.example.com" },
    { id: otherIntegrationId, name: "Jellyfin", kind: "jellyfin", url: "https://jellyfin.example.com" },
  ]);
  await db.insert(integrationUserPermissions).values([
    { integrationId, userId, permission: "use" },
    { integrationId: otherIntegrationId, userId, permission: "use" },
  ]);

  const clockItemId = createId();
  const mediaItemId = createId();
  await db.insert(items).values([
    { id: clockItemId, kind: "clock", options: stringify({ is24HourFormat: true }), boardId },
    {
      id: mediaItemId,
      kind: "mediaServer",
      options: stringify({ showOnlyPlaying: false }),
      advancedOptions: stringify(mediaAdvancedOptions),
      boardId,
    },
  ]);
  await db.insert(itemLayouts).values(
    [mobileLayoutId, baseLayoutId].flatMap((layoutId) => [
      { itemId: clockItemId, sectionId: rootSectionId, layoutId, xOffset: 0, yOffset: 0, width: 2, height: 1 },
      { itemId: mediaItemId, sectionId: containerId, layoutId, xOffset: 0, yOffset: 0, width: 3, height: 2 },
    ]),
  );
  await db.insert(integrationItems).values({ itemId: mediaItemId, integrationId });

  const otherBoardId = createId();
  await db.insert(boards).values({ id: otherBoardId, name: "other", creatorId: userId });

  return {
    db,
    userId,
    boardId,
    otherBoardId,
    rootSectionId,
    containerId,
    clockItemId,
    mediaItemId,
    integrationId,
    otherIntegrationId,
    caller: boardRouter.createCaller({ db, deviceType: undefined, session: createSession(userId) }),
  };
};

const createViewerCallerAsync = async (db: Database, boardId: string) => {
  const viewerId = createId();
  await db.insert(users).values({ id: viewerId });
  await db.insert(boardUserPermissions).values({ boardId, userId: viewerId, permission: "view" });
  return boardRouter.createCaller({ db, deviceType: undefined, session: createSession(viewerId) });
};

describe("board content endpoints", () => {
  test("getBoardContent returns content that saveBoard accepts without changes", async () => {
    const { db, caller, boardId, containerId } = await createBoardWithContentAsync();

    const content = await caller.getBoardContent({ id: boardId });

    expect(content.layouts.map((layout) => layout.role)).toEqual(["mobile", "base"]);
    const container = content.sections.find((section) => section.id === containerId);
    expect(container).toMatchObject({ kind: "container", options: { title: "Media", collapsible: true } });
    expect(container).not.toHaveProperty("collapsed");

    await caller.saveBoard(content);

    await expect(caller.getBoardContent({ id: boardId })).resolves.toEqual(content);
    await expect(db.$count(itemLayouts)).resolves.toBe(4);
    await expect(db.$count(integrationItems)).resolves.toBe(1);
  });

  test("getItem returns an item only through its own board", async () => {
    const { caller, boardId, otherBoardId, mediaItemId, containerId, integrationId } =
      await createBoardWithContentAsync();

    const item = await caller.getItem({ boardId, itemId: mediaItemId });

    expect(item).toMatchObject({
      kind: "mediaServer",
      options: { showOnlyPlaying: false },
      advancedOptions: mediaAdvancedOptions,
      integrationIds: [integrationId],
    });
    expect(item.layouts).toHaveLength(2);
    expect(item.layouts.every((layout) => layout.sectionId === containerId)).toBe(true);
    await expect(caller.getItem({ boardId: otherBoardId, itemId: mediaItemId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  test("updateItem replaces the supplied fields and keeps the others", async () => {
    const { caller, boardId, mediaItemId, integrationId, otherIntegrationId } = await createBoardWithContentAsync();

    const updated = await caller.updateItem({ boardId, itemId: mediaItemId, options: { showBitrate: false } });

    // The supplied options replace the stored ones instead of being merged into them
    expect(updated.options).toMatchObject({ showBitrate: false });
    expect(updated.options).not.toMatchObject({ showOnlyPlaying: false });
    expect(updated.advancedOptions).toEqual(mediaAdvancedOptions);
    expect(updated.integrationIds).toEqual([integrationId]);

    await caller.updateItem({ boardId, itemId: mediaItemId, integrationIds: [otherIntegrationId] });

    await expect(caller.getItem({ boardId, itemId: mediaItemId })).resolves.toMatchObject({
      options: { showBitrate: false },
      advancedOptions: mediaAdvancedOptions,
      integrationIds: [otherIntegrationId],
    });
  });

  test("updateItem returns the item as a following read returns it", async () => {
    const { db, caller, boardId, mediaItemId, otherIntegrationId } = await createBoardWithContentAsync();
    await db.insert(integrationItems).values({ itemId: mediaItemId, integrationId: otherIntegrationId });
    const { integrationIds } = await caller.getItem({ boardId, itemId: mediaItemId });

    const updated = await caller.updateItem({
      boardId,
      itemId: mediaItemId,
      integrationIds: integrationIds.toReversed(),
    });

    await expect(caller.getItem({ boardId, itemId: mediaItemId })).resolves.toEqual(updated);
  });

  test("updateItem rejects an integration the current user cannot use", async () => {
    const { db, caller, boardId, mediaItemId, integrationId } = await createBoardWithContentAsync();
    const privateIntegrationId = createId();
    await db.insert(integrations).values({
      id: privateIntegrationId,
      name: "Private Plex",
      kind: "plex",
      url: "https://private.example.com",
    });

    await expect(
      caller.updateItem({ boardId, itemId: mediaItemId, integrationIds: [privateIntegrationId] }),
    ).rejects.toThrow("Integration not found");

    await expect(caller.getItem({ boardId, itemId: mediaItemId })).resolves.toMatchObject({
      integrationIds: [integrationId],
    });
  });

  test("updateItem stores legacy app tile options as openIn", async () => {
    const { db, caller, boardId, rootSectionId } = await createBoardWithContentAsync();
    const appItemId = createId();
    await db.insert(items).values({ id: appItemId, kind: "app", options: stringify({ appId: "app-1" }), boardId });
    const baseLayout = await db.query.layouts.findFirst({ where: (table, { eq }) => eq(table.role, "base") });
    await db.insert(itemLayouts).values({
      itemId: appItemId,
      sectionId: rootSectionId,
      layoutId: baseLayout?.id ?? "",
      xOffset: 3,
      yOffset: 0,
      width: 1,
      height: 1,
    });

    const updated = await caller.updateItem({
      boardId,
      itemId: appItemId,
      options: { appId: "app-1", openInNewTab: false },
    });

    expect(updated.options).toEqual({ appId: "app-1", openIn: "currentTab" });
    await expect(caller.getItem({ boardId, itemId: appItemId })).resolves.toEqual(updated);
  });

  test("updateItem requires admin permission to change Custom Widget options", async () => {
    const { db, caller, boardId, rootSectionId } = await createBoardWithContentAsync();
    const customWidgetItemId = createId();
    const options = { definitionId: "definition-1", refreshInterval: 30, configuration: {} };
    await db.insert(items).values({ id: customWidgetItemId, kind: "customApi", options: stringify(options), boardId });
    const baseLayout = await db.query.layouts.findFirst({ where: (table, { eq }) => eq(table.role, "base") });
    await db.insert(itemLayouts).values({
      itemId: customWidgetItemId,
      sectionId: rootSectionId,
      layoutId: baseLayout?.id ?? "",
      xOffset: 3,
      yOffset: 0,
      width: 3,
      height: 2,
    });

    await expect(
      caller.updateItem({ boardId, itemId: customWidgetItemId, options: { ...options, refreshInterval: 60 } }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      caller.updateItem({
        boardId,
        itemId: customWidgetItemId,
        advancedOptions: { title: "Status", customCssClasses: [], borderColor: "" },
      }),
    ).resolves.toMatchObject({ options, advancedOptions: { title: "Status" } });
  });

  test("deleteItem removes an item only from its own board", async () => {
    const { db, caller, boardId, otherBoardId, clockItemId, mediaItemId } = await createBoardWithContentAsync();

    await expect(caller.deleteItem({ boardId: otherBoardId, itemId: mediaItemId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await caller.deleteItem({ boardId, itemId: mediaItemId });

    const content = await caller.getBoardContent({ id: boardId });
    expect(content.items.map((item) => item.id)).toEqual([clockItemId]);
    await expect(db.$count(itemLayouts)).resolves.toBe(2);
    await expect(db.$count(integrationItems)).resolves.toBe(0);
    await expect(caller.deleteItem({ boardId, itemId: mediaItemId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("users with view access can read the content but not change items", async () => {
    const { db, boardId, mediaItemId } = await createBoardWithContentAsync();
    const viewerCaller = await createViewerCallerAsync(db, boardId);

    await expect(viewerCaller.getBoardContent({ id: boardId })).resolves.toMatchObject({ id: boardId });
    const item = await viewerCaller.getItem({ boardId, itemId: mediaItemId });
    await expect(
      viewerCaller.updateItem({ boardId, itemId: mediaItemId, options: { showBitrate: false } }),
    ).rejects.toBeInstanceOf(TRPCError);
    await expect(viewerCaller.deleteItem({ boardId, itemId: mediaItemId })).rejects.toBeInstanceOf(TRPCError);

    await expect(viewerCaller.getItem({ boardId, itemId: mediaItemId })).resolves.toEqual(item);
  });
});
