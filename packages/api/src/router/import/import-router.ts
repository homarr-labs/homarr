import AdmZip from "adm-zip";
import { zfd } from "zod-form-data";

import { logger } from "@homarr/log";
import { oldmarrConfigSchema } from "@homarr/old-schema";

import { createTRPCRouter, publicProcedure } from "../../trpc";

export const importRouter = createTRPCRouter({
  analyseOldmarrImport: publicProcedure
    .input(
      zfd.formData({
        file: zfd.file(),
      }),
    )
    .mutation(async ({ input }) => {
      const arrayBuffer = await input.file.arrayBuffer();
      const zip = new AdmZip(Buffer.from(arrayBuffer));
      const entries = zip.getEntries();
      const configEntries = entries.filter(
        (entry) => entry.entryName.endsWith(".json") && !entry.entryName.includes("/"),
      );
      const configs = configEntries.map((entry) => {
        const result = oldmarrConfigSchema.safeParse(JSON.parse(entry.getData().toString()));
        if (!result.success) {
          logger.error(`Failed to parse config ${entry.entryName} with error: ${JSON.stringify(result.error)}`);
        }

        return {
          name: entry.name,
          config: result.data ?? null,
          isError: !result.success,
        };
      });

      const userEntry = entries.find((entry) => entry.entryName === "users/users.json");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const userCount = userEntry ? (JSON.parse(userEntry.getData().toString()).length as number) : 0;

      const checksum = entries
        .find((entry) => entry.entryName === "checksum.txt")
        ?.getData()
        .toString("utf-8");

      return {
        configs,
        userCount,
        checksum,
      };
    }),
});
