import { TRPCError } from "@trpc/server";
import { zfd } from "zod-form-data";

import { env } from "@homarr/auth/env.mjs";
import { decryptSecretWithKey } from "@homarr/common/server";
import { createId } from "@homarr/db";
import { createDefaultAdminGroupIfNotExistsAsync } from "@homarr/db/queries";
import { groupMembers, users } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import { importMultiple } from "@homarr/old-import";
import {
  checkTokenWithChecksum,
  extractOldmarrMigrationZipAsync,
  oldmarrChecksumSchema,
} from "@homarr/old-import/migration";
import { oldmarrImportConfigurationSchema, z } from "@homarr/validation";
import { createCustomErrorParams } from "@homarr/validation/form";

import { createTRPCRouter, publicProcedure } from "../../trpc";

const oldmarrImportFileSchema = zfd.file().superRefine((value, context) => {
  if (value.type !== "application/zip") {
    return context.addIssue({
      code: "custom",
      params: createCustomErrorParams({
        key: "invalidFileType",
        params: { expected: "ZIP" },
      }),
    });
  }

  return null;
});

export const onboardingRouter = createTRPCRouter({
  checkToken: publicProcedure
    .input(
      z.object({
        checksum: oldmarrChecksumSchema,
        token: z.string(),
      }),
    )
    .mutation(({ input }) => {
      const isValid = checkTokenWithChecksum(input.checksum, input.token);
      if (!isValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid token",
        });
      }
    }),
  analyseOldmarrImport: publicProcedure
    .input(
      zfd.formData({
        file: oldmarrImportFileSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const { configurations, checksum, credentialUsers, exportSettings } = await extractOldmarrMigrationZipAsync(
        input.file,
      );

      return {
        configurations,
        checksum,
        userCount: credentialUsers?.length ?? 0,
        exportSettings,
      };
    }),
  importOldmarr: publicProcedure
    .input(
      zfd.formData({
        file: oldmarrImportFileSchema,
        token: zfd.text().optional(),
        importConfiguration: zfd.json(
          z.object({
            common: oldmarrImportConfigurationSchema.omit({ name: true, screenSize: true }),
            boardSpecific: z.array(
              oldmarrImportConfigurationSchema
                .pick({ name: true, screenSize: true })
                .and(z.object({ configName: z.string() })),
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { configurations, checksum, credentialUsers, exportSettings } = await extractOldmarrMigrationZipAsync(
        input.file,
      );

      // Token is only needed for users and integrations
      if (input.token) {
        const isValid = checkTokenWithChecksum(checksum, input.token);
        if (!isValid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid token",
          });
        }

        const encryptionToken = Buffer.from(input.token, "hex");

        if (exportSettings.integrations) {
          // Decrypt all integration secrets
          configurations.forEach((config) => {
            config.apps.forEach((app) => {
              if (app.integration) {
                app.integration.properties.forEach((property) => {
                  if (property.value) {
                    property.value = decryptSecretWithKey(property.value as `${string}.${string}`, encryptionToken);
                  }
                });
              }
            });
          });
        }

        if (credentialUsers) {
          // Decrypt all user passwords and salts
          credentialUsers.forEach((user) => {
            user.password = decryptSecretWithKey(user.password as `${string}.${string}`, encryptionToken);
            user.salt = decryptSecretWithKey(user.salt as `${string}.${string}`, encryptionToken);
          });
        }
      }

      const boardImports = input.importConfiguration.boardSpecific
        .map((config) => {
          const configuration = configurations.find(
            ({ configProperties }) => configProperties.name === config.configName,
          );
          if (!configuration) {
            logger.error(`Could not find configuration for ${config.name}`);
            return null;
          }

          return {
            old: configuration,
            configuration: config,
          };
        })
        .filter((result) => result !== null);

      let adminGroupId: string | null = null;
      if (credentialUsers && env.AUTH_PROVIDERS.includes("credentials")) {
        adminGroupId = await createDefaultAdminGroupIfNotExistsAsync(ctx.db);
      }

      // Transactions don't work with async/await, see https://github.com/WiseLibs/better-sqlite3/issues/1262 and https://github.com/drizzle-team/drizzle-orm/issues/1723
      ctx.db.transaction((transaction) => {
        importMultiple(transaction, boardImports, {
          ...input.importConfiguration.common,
          importIntegrations: exportSettings.integrations,
        });

        if (credentialUsers && env.AUTH_PROVIDERS.includes("credentials")) {
          const usersMap = new Map(credentialUsers.map((user) => [createId(), user]));

          transaction
            .insert(users)
            .values(
              [...usersMap.entries()].map(([id, user]) => ({
                id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified,
                image: user.image,
                password: user.password,
                salt: user.salt,
                pingIconsEnabled: user.settings.replacePingWithIcons,
                colorScheme: user.settings.colorScheme === "environment" ? "light" : user.settings.colorScheme,
                firstDayOfWeek: user.settings.firstDayOfWeek,
                homeBoardId: null,
                provider: "credentials" as const,
              })),
            )
            .run();

          if (adminGroupId) {
            const groupMemberUserIds = [...usersMap.entries()]
              .filter(([, user]) => user.isAdmin || user.isOwner)
              .map(([id]) => id);

            if (groupMemberUserIds.length > 0) {
              transaction
                .insert(groupMembers)
                .values(groupMemberUserIds.map((userId) => ({ userId, groupId: adminGroupId })))
                .run();
            }
          }
        }
      });
    }),
});
