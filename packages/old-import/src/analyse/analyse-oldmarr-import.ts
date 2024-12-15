import AdmZip from "adm-zip";
import { z } from "zod";

import { logger } from "@homarr/log";
import { oldmarrConfigSchema } from "@homarr/old-schema";

import { oldmarrImportUserSchema } from "../user-schema";
import type { analyseOldmarrImportInputSchema } from "./input";

export const analyseOldmarrImportForRouterAsync = async (input: z.infer<typeof analyseOldmarrImportInputSchema>) => {
  const { configs, checksum, users } = await analyseOldmarrImportAsync(input.file);

  return {
    configs,
    checksum,
    userCount: users.length,
  };
};

export const analyseOldmarrImportAsync = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = new AdmZip(Buffer.from(arrayBuffer));
  const entries = zip.getEntries();
  const configEntries = entries.filter((entry) => entry.entryName.endsWith(".json") && !entry.entryName.includes("/"));
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
  const users = parseUsers(userEntry);

  const checksum = entries
    .find((entry) => entry.entryName === "checksum.txt")
    ?.getData()
    .toString("utf-8");

  return {
    configs,
    users,
    checksum,
  };
};

export type AnalyseResult = Awaited<ReturnType<typeof analyseOldmarrImportForRouterAsync>>;

const parseUsers = (entry: AdmZip.IZipEntry | undefined) => {
  if (!entry) return [];

  const result = z.array(oldmarrImportUserSchema).safeParse(JSON.parse(entry.getData().toString()));
  if (!result.success) {
    logger.error(`Failed to parse users with error: ${JSON.stringify(result.error)}`);
  }

  return result.data ?? [];
};
