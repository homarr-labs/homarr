import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { backendContractRevision } from "../context";
import { defineBackendContribution } from "../contribution";
import type { SourceLeafPath } from "../port-map";
import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import { BoardNameConflictError, createBoardAccessHelpers } from "./-boards/access";
import { createBoardOverviewReader, maxManageOverviewPreviewRows } from "./-boards/overview";
import { createBoardReaders } from "./-boards/reads";
import type { BoardProcedureResources } from "./-boards/resources";
import { requireBoardPrincipal, withBoardReadAsync } from "./-boards/scope";

export type { BoardProcedureResources, BoardReadLease } from "./-boards/resources";

export const boardImplementedPaths = [
  "board.exists",
  "board.getPublicBoards",
  "board.getBoardsForGroup",
  "board.getAllBoards",
  "board.getManageOverview",
  "board.catalog",
  "board.search",
  "board.getBoardSettings",
  "board.getBoardPermissions",
] as const satisfies readonly SourceLeafPath[];

export const boardPendingPaths = [
  "board.createBoard",
  "board.duplicateBoard",
  "board.renameBoard",
  "board.changeBoardVisibility",
  "board.deleteBoard",
  "board.setHomeBoard",
  "board.setMobileHomeBoard",
  "board.getHomeBoard",
  "board.getBoardByName",
  "board.saveLayouts",
  "board.resetLayout",
  "board.savePartialBoardSettings",
  "board.saveBoard",
  "board.saveUserBoardPermissions",
  "board.saveGroupBoardPermissions",
  "board.addItem",
  "board.updateItemLayout",
] as const satisfies readonly SourceLeafPath[];

export const boardSourceBindings = [
  ...boardImplementedPaths.map((path) => ({
    path,
    sourceFile: "packages/api/src/router/board.ts",
    status: "native" as const,
  })),
  ...boardPendingPaths.map((path) => ({
    path,
    sourceFile: "packages/api/src/router/board.ts",
    status: "pending" as const,
    reason:
      path === "board.getHomeBoard" || path === "board.getBoardByName"
        ? "Full-board query performs protected-layout repair writes; no concrete atomic repair plan is accepted."
        : "Concrete current-authority atomic board mutation, cleanup and invalidation plan is not accepted.",
  })),
] as const;

export const boardManageOverviewInputSchema = z
  .object({
    fullPreview: z.boolean().default(false),
    previewRowLimit: z.number().int().min(1).max(maxManageOverviewPreviewRows).optional(),
    userId: z.string().optional(),
  })
  .optional();

export function createBoardProcedures(resources: BoardProcedureResources) {
  const { noBoardWithSimilarNameAsync, searchAccessibleBoardsAsync } = createBoardAccessHelpers(resources);
  const {
    getPublicBoardsAsync,
    getBoardsForGroupAsync,
    getAllBoardsAsync,
    getBoardSettingsAsync,
    getBoardPermissionsAsync,
  } = createBoardReaders(resources);
  const getManageOverviewAsync = createBoardOverviewReader(resources);
  const summaryOutputSchema = z.array(resources.schemas.boardSummarySchema);
  return {
    exists: authenticatedProcedure({
      path: "board.exists",
      kind: "query",
      access: { kind: "permission", permission: "board-create" },
      demo: "guarded",
    })
      .input(z.string())
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, async (scope) => {
          requireBoardPrincipal(scope, "board-create");
          try {
            await noBoardWithSimilarNameAsync(scope, input);
            return false;
          } catch (error) {
            if (error instanceof BoardNameConflictError) return true;
            throw error;
          }
        }),
      ),
    getPublicBoards: sourceProcedure({
      path: "board.getPublicBoards",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    }).handler(({ context }) => withBoardReadAsync(resources, context, getPublicBoardsAsync)),
    getBoardsForGroup: authenticatedProcedure({
      path: "board.getBoardsForGroup",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ groupId: z.string() }))
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, (scope) => getBoardsForGroupAsync(scope, input.groupId)),
      ),
    getAllBoards: sourceProcedure({
      path: "board.getAllBoards",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .input(z.void())
      .output(summaryOutputSchema)
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/boards",
            tags: ["boards"],
            protect: true,
            summary: "List accessible boards",
            description:
              "Return accessible boards with creator details, visibility, and the current user's desktop and mobile home flags. Anonymous callers can see public boards.",
          },
          mcp: {
            enabled: true,
            description:
              "List all boards the current user can access. Returns id, name, logoImageUrl, isPublic, creator, isHome and isMobileHome flags",
          },
        }),
      )
      .handler(({ context }) =>
        withBoardReadAsync(resources, context, async (scope) => {
          const result = summaryOutputSchema.safeParse(await getAllBoardsAsync(scope));
          if (!result.success) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Output validation failed" });
          return result.data;
        }),
      ),
    getManageOverview: sourceProcedure({
      path: "board.getManageOverview",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .input(boardManageOverviewInputSchema)
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, (scope) => getManageOverviewAsync(scope, input)),
      ),
    catalog: sourceProcedure({
      path: "board.catalog",
      kind: "query",
      access: { kind: "public" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({ mcp: { enabled: true, description: "List every board the current user can access." } }),
      )
      .handler(({ context }) =>
        withBoardReadAsync(resources, context, (scope) => searchAccessibleBoardsAsync(scope, "")),
      ),
    search: sourceProcedure({ path: "board.search", kind: "query", access: { kind: "public" }, demo: "guarded" })
      .meta(
        sourceProjectionMeta({
          mcp: {
            enabled: true,
            description: "Search accessible boards by name. REQUIRED: query (string). OPTIONAL: limit (number).",
          },
        }),
      )
      .input(z.object({ query: z.string(), limit: z.number().min(1).max(100).default(10) }))
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, (scope) => searchAccessibleBoardsAsync(scope, input.query, input.limit)),
      ),
    getBoardSettings: authenticatedProcedure({
      path: "board.getBoardSettings",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .meta(
        sourceProjectionMeta({
          openapi: {
            method: "GET",
            path: "/api/boards/{id}/settings",
            tags: ["boards"],
            protect: true,
            summary: "Read board settings",
            description: "Read editable board settings. Requires modify access to the board.",
          },
          mcp: {
            enabled: true,
            description:
              "Read the editable visual and behavior settings for one board, including its current custom CSS. Requires modify permission. REQUIRED: id (board ID). Call this before proposing board settings or custom CSS changes",
          },
        }),
      )
      .input(z.object({ id: z.string() }))
      .output(resources.schemas.boardSettingsSchema)
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, async (scope) => {
          const result = resources.schemas.boardSettingsSchema.safeParse(await getBoardSettingsAsync(scope, input.id));
          if (!result.success) throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Output validation failed" });
          return result.data;
        }),
      ),
    getBoardPermissions: authenticatedProcedure({
      path: "board.getBoardPermissions",
      kind: "query",
      access: { kind: "protected" },
      demo: "guarded",
    })
      .input(resources.schemas.byIdSchema)
      .handler(({ input, context }) =>
        withBoardReadAsync(resources, context, (scope) => getBoardPermissionsAsync(scope, input.id)),
      ),
  };
}

export function createBoardContribution(resources: BoardProcedureResources) {
  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.board.source-port.v2",
    router: { board: createBoardProcedures(resources) },
    leaves: boardImplementedPaths,
  });
}
