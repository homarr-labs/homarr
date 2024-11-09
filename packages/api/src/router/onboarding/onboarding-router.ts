import { TRPCError } from "@trpc/server";
import AdmZip from "adm-zip";
import { zfd } from "zod-form-data";

import { decryptSecretWithKey } from "@homarr/common/server";
import { logger } from "@homarr/log";
import { importMultiple } from "@homarr/old-import";
import { oldmarrConfigSchema } from "@homarr/old-schema";
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
    .input(z.object({ checksum: z.array(z.string()).length(2), token: z.string() }))
    .mutation(({ input }) => {
      const isValid = validateTokenWithChecksum(input.checksum, input.token);
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
      const { configurations, checksumTxtContent, usersJsonContent } = await extractOldmarrFilesFromArchiveAsync(
        input.file,
      );

      const userCount = usersJsonContent ? (JSON.parse(usersJsonContent) as unknown[]).length : 0;

      return {
        configurations,
        checksum: checksumTxtContent?.split("\n"),
        userCount,
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
      const { configurations, checksumTxtContent, usersJsonContent } = await extractOldmarrFilesFromArchiveAsync(
        input.file,
      );

      // Token is only needed for users and integrations
      if (input.token) {
        const isValid = validateTokenWithChecksum(checksumTxtContent?.split("\n") ?? [], input.token);
        if (!isValid) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Invalid token",
          });
        }
      }

      const encryptionToken = input.token ? Buffer.from(input.token, "hex") : null;
      const maybeDecryptedConfigurations = encryptionToken
        ? configurations.map((config) => ({
            ...config,
            apps: config.apps.map((app) => ({
              ...app,
              integration: app.integration
                ? {
                    ...app.integration,
                    properties: app.integration.properties.map((property) => ({
                      ...property,
                      value: property.value
                        ? decryptSecretWithKey(property.value as `${string}.${string}`, encryptionToken)
                        : null,
                    })),
                  }
                : undefined,
            })),
          }))
        : configurations;

      const imports = input.importConfiguration.boardSpecific
        .map((config) => {
          const configuration = maybeDecryptedConfigurations.find(
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

      // Transactions don't work with async/await, see https://github.com/WiseLibs/better-sqlite3/issues/1262 and https://github.com/drizzle-team/drizzle-orm/issues/1723
      ctx.db.transaction((transaction) => {
        importMultiple(transaction, imports, {
          ...input.importConfiguration.common,
          importIntegrations: input.token !== undefined,
        });

        /*if (input.token) {
          transaction.insert(users).values().run();
        }*/
      });
    }),
});

const extractOldmarrFilesFromArchiveAsync = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new AdmZip(Buffer.from(arrayBuffer));

  const configurations = zip
    .getEntries()
    .map((entry) => {
      if (entry.entryName === "users/users.json") return null;
      if (!entry.entryName.endsWith(".json")) return null;

      const content = entry.getData().toString("utf8");
      const result = oldmarrConfigSchema.safeParse(JSON.parse(content));

      if (!result.success) {
        logger.error(result.error);
        return null;
      }

      return result.data;
    })
    .filter((result) => result !== null);

  const checksumTxtContent = zip.getEntry("checksum.txt")?.getData().toString("utf8");
  const usersJsonContent = zip.getEntry("users/users.json")?.getData().toString("utf8");

  return {
    configurations,
    checksumTxtContent,
    usersJsonContent,
  };
};

const validateTokenWithChecksum = (checksum: string[], token: string) => {
  const [raw, encrypted] = checksum as [string, `${string}.${string}`];

  try {
    const decrypted = decryptSecretWithKey(encrypted, Buffer.from(token, "hex"));
    if (decrypted === raw) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};
