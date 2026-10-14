import { randomBytes } from "node:crypto";
import { z } from "zod/v4";

import { hashPasswordAsync } from "@homarr/auth/security";

import type { SourceLeafPath } from "../port-map";
import { identityProcedure } from "./-identity/projection";
import type { ApiKeyProcedureResources } from "./-identity/resources";

export const portedApiKeyPaths = [
  "apiKeys.getAll",
  "apiKeys.create",
  "apiKeys.delete",
] as const satisfies readonly SourceLeafPath[];
export const pendingApiKeyPaths = [] as const;

export function createApiKeyProcedures(resources: ApiKeyProcedureResources) {
  const { eq } = resources.operators;
  return {
    getAll: identityProcedure({
      path: "apiKeys.getAll",
      kind: "query",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).handler(({ context }) =>
      context.db.query.apiKeys.findMany({
        columns: { id: true, apiKey: false },
        with: { user: { columns: { id: true, name: true, image: true, email: true } } },
      }),
    ),
    create: identityProcedure({
      path: "apiKeys.create",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    }).handler(async ({ context }) => {
      const id = randomBytes(4).toString("hex");
      const token = randomBytes(24).toString("hex");
      const hashedToken = await hashPasswordAsync(token);
      await context.db
        .insert(resources.tables.apiKeys)
        .values({ id, apiKey: hashedToken, userId: context.principal.user.id });
      return { apiKey: `${id}.${token}` };
    }),
    delete: identityProcedure({
      path: "apiKeys.delete",
      kind: "mutation",
      access: { kind: "permission", permission: "admin" },
      demo: "guarded",
    })
      .input(z.object({ apiKeyId: z.string() }))
      .handler(async ({ context, input }) => {
        await context.db
          .delete(resources.tables.apiKeys)
          .where(eq(resources.tables.apiKeys.id, input.apiKeyId))
          .limit(1);
      }),
  };
}
