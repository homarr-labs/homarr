import assert from "node:assert/strict";
import { call, ORPCError } from "@orpc/server";
import { stringify } from "superjson";
import type { Database } from "@homarr/db";
import type { items } from "@homarr/db/schema";

import type { BackendContext, BackendPrincipal } from "../context";
import {
  boardImplementedPaths,
  boardPendingPaths,
  boardSourceBindings,
  createBoardContribution,
  createBoardProcedures,
} from "../routers/board";
import type { BoardProcedureResources } from "../routers/board";
import { withBoardReadAsync } from "../routers/-boards/scope";

export const boardFixtureIds = {
  owner: "board-check-owner",
  viewer: "board-check-viewer",
  group: "board-check-group",
  visible: "board-check-visible",
  hidden: "board-check-hidden",
  app: "board-check-app",
  passwordMarker: "disposable-board-password-marker",
} as const;

export async function seedBoardFixtureAsync(
  db: Database,
  tables: BoardProcedureResources["tables"] & { readonly items: typeof items },
) {
  const ids = boardFixtureIds;
  await db.insert(tables.users).values([
    { id: ids.owner, name: "Owner", email: "owner@disposable.invalid", password: ids.passwordMarker },
    { id: ids.viewer, name: "Viewer", email: "viewer@disposable.invalid", password: ids.passwordMarker },
  ]);
  await db.insert(tables.groups).values({ id: ids.group, name: "Board check group", position: 0 });
  await db.insert(tables.groupMembers).values({ groupId: ids.group, userId: ids.viewer });
  await db.insert(tables.boards).values([
    { id: ids.visible, name: "VisibleBoard", isPublic: true, creatorId: ids.owner },
    { id: ids.hidden, name: "HiddenBoard", isPublic: false, creatorId: ids.owner },
  ]);
  await db.insert(tables.boardUserPermissions).values({ boardId: ids.visible, userId: ids.viewer, permission: "view" });
  await db
    .insert(tables.boardGroupPermissions)
    .values({ boardId: ids.visible, groupId: ids.group, permission: "view" });
  await db.insert(tables.apps).values({ id: ids.app, name: "Fixture app", iconUrl: "/fixture-icon.svg" });
  for (const boardId of [ids.visible, ids.hidden]) {
    const layoutId = `${boardId}-layout`;
    const rootId = `${boardId}-root`;
    const containerId = `${boardId}-container`;
    await db.insert(tables.layouts).values({ id: layoutId, name: "Base", boardId, columnCount: 4, role: "base" });
    await db.insert(tables.sections).values([
      { id: rootId, boardId, kind: "empty", xOffset: 0 },
      { id: containerId, boardId, kind: "container" },
    ]);
    await db.insert(tables.sectionLayouts).values({
      sectionId: containerId,
      layoutId,
      parentSectionId: rootId,
      xOffset: 1,
      yOffset: 1,
      width: 2,
      height: 3,
    });
    await db.insert(tables.items).values([
      { id: `${boardId}-root-item`, boardId, kind: "clock", options: stringify({ marker: boardId }) },
      { id: `${boardId}-app-item`, boardId, kind: "app", options: stringify({ appId: ids.app }) },
      { id: `${boardId}-clipped-item`, boardId, kind: "clock" },
    ]);
    await db.insert(tables.itemLayouts).values([
      {
        itemId: `${boardId}-root-item`,
        layoutId,
        sectionId: rootId,
        xOffset: 0,
        yOffset: 0,
        width: 1,
        height: 1,
      },
      {
        itemId: `${boardId}-app-item`,
        layoutId,
        sectionId: containerId,
        xOffset: 1,
        yOffset: 2,
        width: 1,
        height: 1,
      },
      {
        itemId: `${boardId}-clipped-item`,
        layoutId,
        sectionId: rootId,
        xOffset: 0,
        yOffset: 12,
        width: 1,
        height: 1,
      },
    ]);
  }
}

export interface BoardFixtureCheckResources {
  readonly resources: BoardProcedureResources;
  readonly db: Database;
  readonly sqlQueries: readonly string[];
}

function fixtureContext(db: Database, principal: BackendPrincipal, signal?: AbortSignal): BackendContext {
  const request = new Request("https://disposable.invalid/board-check");
  return {
    db,
    principal,
    request,
    signal: signal ?? request.signal,
    deviceType: undefined,
    demo: { enabled: false, readOnly: false },
    setup: {
      async isClaimOnlyAccessAllowed() {
        return false;
      },
      async currentStep() {
        return "setup";
      },
    },
    effect() {
      throw new Error("Board reads must not produce response effects");
    },
    onDispose() {
      throw new Error("Board reads must release their own lease");
    },
  };
}

function isBoardNotFound(error: unknown) {
  return error instanceof ORPCError && error.code === "NOT_FOUND" && error.message === "Board not found";
}

export async function checkBoardSqliteFixtureAsync(fixture: BoardFixtureCheckResources) {
  const { resources, db, sqlQueries } = fixture;
  const ids = boardFixtureIds;
  const principal: BackendPrincipal = {
    kind: "authenticated",
    user: {
      id: ids.viewer,
      permissions: ["board-create"],
      name: "Viewer",
      email: "viewer@disposable.invalid",
      image: null,
      colorScheme: "dark",
    },
  };
  const context = fixtureContext(db, principal);
  const anonymous = fixtureContext(db, { kind: "anonymous" });
  const router = createBoardProcedures(resources);
  const contribution = createBoardContribution(resources);
  assert.equal(contribution.leaves.length, 9);
  assert.equal(boardImplementedPaths.length, 9);
  assert.equal(boardPendingPaths.length, 17);
  assert.equal(new Set(boardSourceBindings.map(({ path }) => path)).size, 26);
  assert.deepEqual(
    Object.keys(router).map((name) => `board.${name}`),
    [...boardImplementedPaths],
  );
  for (const path of boardPendingPaths) assert.equal(path.slice(6) in router, false);

  let before = sqlQueries.length;
  await assert.rejects(call(router.exists, "HiddenBoard", { context: anonymous }), { code: "UNAUTHORIZED" });
  assert.equal(sqlQueries.length, before);
  await assert.rejects(call(router.getManageOverview, { userId: ids.owner }, { context }), { code: "FORBIDDEN" });
  assert.equal(sqlQueries.length, before);
  for (const id of [ids.visible, ids.hidden, "board-check-missing"]) {
    before = sqlQueries.length;
    await assert.rejects(call(router.getBoardSettings, { id }, { context }), isBoardNotFound);
    assert.equal(sqlQueries.length - before, 1);
    before = sqlQueries.length;
    await assert.rejects(call(router.getBoardPermissions, { id }, { context }), isBoardNotFound);
    assert.equal(sqlQueries.length - before, 1);
  }
  assert.equal(await call(router.exists, "hiddenboard", { context }), true);
  {
    let checks = 0;
    let releases = 0;
    let assertionSettled = false;
    const start = sqlQueries.length;
    const leaseConflict = new ORPCError("CONFLICT", { message: "Read authority is no longer current" });
    const releaseStarted = Promise.withResolvers<void>();
    const finishRelease = Promise.withResolvers<void>();
    const controlled: BoardProcedureResources = {
      ...resources,
      async acquireReadAsync(currentContext) {
        const lease = await resources.acquireReadAsync(currentContext);
        return {
          db: lease.db,
          principal: lease.principal,
          async assertCurrentAsync() {
            await lease.assertCurrentAsync();
            checks++;
            if (checks === 3) {
              assert.equal(sqlQueries.length - start, 1);
              throw leaseConflict;
            }
          },
          async releaseAsync() {
            await lease.releaseAsync();
            releaseStarted.resolve();
            await finishRelease.promise;
            releases++;
          },
        };
      },
    };
    const assertion = assert
      .rejects(
        call(createBoardProcedures(controlled).exists, "UnoccupiedBoard", { context }),
        (error: unknown) => error === leaseConflict,
      )
      .then(() => {
        assertionSettled = true;
      });
    await releaseStarted.promise;
    assert.equal(assertionSettled, false);
    finishRelease.resolve();
    await assertion;
    assert.equal(checks, 3);
    assert.equal(releases, 1);
  }
  assert.deepEqual(await call(router.getPublicBoards, undefined, { context: anonymous }), [
    { id: ids.visible, name: "VisibleBoard", logoImageUrl: null },
  ]);
  const summaries = await call(router.getAllBoards, undefined, { context });
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.id, ids.visible);
  assert.equal(summaries[0]?.creator?.email, "owner@disposable.invalid");
  assert.deepEqual(summaries[0]?.userPermissions, [{ permission: "view" }]);
  assert.deepEqual(summaries[0]?.groupPermissions, [{ permission: "view" }]);
  const overview = await call(router.getManageOverview, undefined, { context });
  assert.equal(overview.length, 1);
  const board = overview[0];
  assert.ok(board?.preview);
  assert.equal(board.id, ids.visible);
  assert.equal("email" in (board.creator ?? {}), false);
  assert.deepEqual(
    board.preview.layouts.map(({ id }) => id),
    [`${ids.visible}-layout`],
  );
  const container = board.preview.sections.find(({ id }) => id === `${ids.visible}-container`);
  assert.ok(container);
  const containerLayout = container.layouts[0];
  assert.ok(containerLayout);
  assert.deepEqual(containerLayout.section, { kind: "container" });
  assert.equal(containerLayout.parentSectionId, `${ids.visible}-root`);
  assert.deepEqual(board.preview.items.map(({ id }) => id).toSorted(), [
    `${ids.visible}-app-item`,
    `${ids.visible}-root-item`,
  ]);
  const app = board.preview.items.find(({ id }) => id === `${ids.visible}-app-item`);
  assert.ok(app);
  assert.equal(app.iconUrl, "/fixture-icon.svg");
  assert.deepEqual(app.layouts[0]?.item, { kind: "app", options: stringify({ appId: ids.app }) });
  assert.equal(app.layouts[0]?.sectionId, `${ids.visible}-container`);
  const catalog = await call(router.catalog, undefined, { context });
  assert.deepEqual(
    catalog.map(({ id }) => id),
    [ids.visible],
  );
  assert.equal(JSON.stringify({ summaries, overview, catalog }).includes(ids.passwordMarker), false);
  assert.equal(JSON.stringify(overview).includes(ids.hidden), false);

  for (const failure of ["after-query", "final", "abort"] as const) {
    let checks = 0;
    let releases = 0;
    const abort = new AbortController();
    const start = sqlQueries.length;
    const controlled: BoardProcedureResources = {
      ...resources,
      async acquireReadAsync(currentContext) {
        const lease = await resources.acquireReadAsync(currentContext);
        return {
          db: lease.db,
          principal: lease.principal,
          async assertCurrentAsync() {
            await lease.assertCurrentAsync();
            checks++;
            if (checks === (failure === "final" ? 4 : 3)) {
              assert.equal(sqlQueries.length - start, 1);
              if (failure === "abort") abort.abort();
              else throw new ORPCError("UNAUTHORIZED");
            }
          },
          async releaseAsync() {
            await lease.releaseAsync();
            await Promise.resolve();
            releases++;
          },
        };
      },
    };
    await assert.rejects(
      withBoardReadAsync(controlled, fixtureContext(db, principal, abort.signal), async (scope) =>
        scope.readAsync(() =>
          scope.db.query.boards.findMany({
            columns: { id: true },
            where: resources.operators.eq(resources.tables.boards.id, ids.visible),
          }),
        ),
      ),
    );
    assert.equal(releases, 1);
  }
}
