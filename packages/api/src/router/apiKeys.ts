import { createSaltAsync, hashPasswordAsync } from "@homarr/auth";
import { generateSecureRandomToken } from "@homarr/common/server";
import { createId, db } from "@homarr/db";
import { apiKeys } from "@homarr/db/schema/sqlite";

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";

export const apiKeysRouter = createTRPCRouter({
  getAll: permissionRequiredProcedure.requiresPermission("admin").query(() => {
    return db.query.apiKeys.findMany({
      columns: {
        id: true,
        apiKey: false,
        salt: false,
      },
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }),
  create: permissionRequiredProcedure.requiresPermission("admin").mutation(async ({ ctx }) => {
    const salt = await createSaltAsync();
    const randomToken = generateSecureRandomToken(64);
    const hashedRandomToken = await hashPasswordAsync(randomToken, salt);
    await db.insert(apiKeys).values({
      id: createId(),
      apiKey: hashedRandomToken,
      salt,
      userId: ctx.session.user.id,
    });
    return {
      randomToken,
    };
  }),
});
