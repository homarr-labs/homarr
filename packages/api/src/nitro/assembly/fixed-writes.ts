import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import { AppMutationPermissionError } from "@homarr/db/runtime-app";
import type { AppMutation, AppMutationResult } from "@homarr/db/runtime-app";
import { BoardPermissionsMutationError } from "@homarr/db/runtime-board";
import type { BoardPermissionsMutation } from "@homarr/db/runtime-board";
import { selectAppSchema } from "@homarr/db/validationSchemas";
import { appManageSchema } from "@homarr/validation/app";
import { boardSavePermissionsSchema } from "@homarr/validation/board";

import { backendContractRevision } from "../context";
import type { BackendContext } from "../context";
import { defineBackendContribution } from "../contribution";
import { sourceProcedure, sourceProjectionMeta } from "../procedure";

interface FixedWriteAssemblyResources {
  readonly createId: () => string;
  saveBoardPermissionsAsync(mutation: BoardPermissionsMutation): Promise<void>;
  createAppAsync(mutation: AppMutation): Promise<AppMutationResult>;
}

export function createFixedWriteAssembly(finalContext: BackendContext, resources: FixedWriteAssemblyResources) {
  const createId = resources.createId;
  const saveBoardPermissionsAsync = resources.saveBoardPermissionsAsync;
  const createAppAsync = resources.createAppAsync;
  const appOutput = z.object({ appId: z.string() }).and(selectAppSchema);
  const assertContext = (context: BackendContext) => {
    if (context !== finalContext) throw new Error("Fixed write context association changed");
    context.signal.throwIfAborted();
  };
  const savePermissionsAsync = async (mutation: BoardPermissionsMutation): Promise<void> => {
    try {
      await saveBoardPermissionsAsync(mutation);
    } catch (error) {
      if (error instanceof BoardPermissionsMutationError) {
        if (error.code === "NOT_FOUND") throw new ORPCError("NOT_FOUND", { message: "Board not found", cause: error });
        if (error.code === "BAD_REQUEST")
          throw new ORPCError("BAD_REQUEST", { message: "Invalid board permissions replacement", cause: error });
        throw new ORPCError("PRECONDITION_FAILED", { message: "Board permissions precondition failed", cause: error });
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Internal server error", cause: error });
    }
  };
  const saveUserBoardPermissions = sourceProcedure({
    path: "board.saveUserBoardPermissions",
    kind: "mutation",
    access: { kind: "protected" },
    demo: "guarded",
  })
    .use(({ context, next }) => {
      assertContext(context);
      return next();
    })
    .input(boardSavePermissionsSchema)
    .handler(async ({ context, input }) => {
      assertContext(context);
      await savePermissionsAsync({
        kind: "replace-user",
        boardId: input.entityId,
        permissions: input.permissions.map((permission) => ({
          principalId: permission.principalId,
          permission: permission.permission,
        })),
      });
    });
  const saveGroupBoardPermissions = sourceProcedure({
    path: "board.saveGroupBoardPermissions",
    kind: "mutation",
    access: { kind: "protected" },
    demo: "guarded",
  })
    .use(({ context, next }) => {
      assertContext(context);
      return next();
    })
    .input(boardSavePermissionsSchema)
    .handler(async ({ context, input }) => {
      assertContext(context);
      await savePermissionsAsync({
        kind: "replace-group",
        boardId: input.entityId,
        permissions: input.permissions.map((permission) => ({
          principalId: permission.principalId,
          permission: permission.permission,
        })),
      });
    });
  const create = sourceProcedure({
    path: "app.create",
    kind: "mutation",
    access: { kind: "permission", permission: "app-create" },
    demo: "guarded",
  })
    .use(({ context, next }) => {
      assertContext(context);
      return next();
    })
    .input(appManageSchema)
    .output(appOutput)
    .meta(
      sourceProjectionMeta({
        openapi: {
          method: "POST",
          path: "/api/apps",
          tags: ["apps"],
          protect: true,
          summary: "Create an app",
          description:
            "Create an app bookmark. Requires app-create permission. Returns the app, including its ID and the legacy appId field. An empty pingUrl disables the custom ping URL.",
        },
        mcp: {
          enabled: true,
          description:
            "Create a new app (bookmark/shortcut to a service). REQUIRED: name (string), iconUrl (icon URL string), href (app URL or custom URI scheme such as vscode://, or blank). OPTIONAL: description (string or null), pingUrl (URL to check reachability, or empty string)",
        },
      }),
    )
    .handler(async ({ context, input }) => {
      assertContext(context);
      const id = createId();
      let pingUrl = input.pingUrl;
      if (pingUrl === "") pingUrl = null;
      let result: AppMutationResult;
      try {
        result = await createAppAsync({
          kind: "create",
          values: {
            id,
            name: input.name,
            description: input.description,
            iconUrl: input.iconUrl,
            href: input.href,
            pingUrl,
          },
        });
      } catch (error) {
        if (error instanceof AppMutationPermissionError)
          throw new ORPCError("FORBIDDEN", { message: "Permission denied", cause: error });
        throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Internal server error", cause: error });
      }
      const parsed = appOutput.safeParse(result);
      if (!parsed.success) throw new Error("Fixed app write output validation failed", { cause: parsed.error });
      return parsed.data;
    });
  return defineBackendContribution({
    revision: backendContractRevision,
    id: "homarr.fixed-writes.source-port.v2",
    router: {
      app: { create },
      board: { saveUserBoardPermissions, saveGroupBoardPermissions },
    },
    leaves: ["app.create", "board.saveUserBoardPermissions", "board.saveGroupBoardPermissions"],
  });
}
