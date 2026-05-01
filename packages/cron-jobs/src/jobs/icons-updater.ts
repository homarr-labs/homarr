import type { MySqlRawQueryResult } from "drizzle-orm/mysql2";
import type { QueryResult } from "pg";

import { createId, splitToNChunks, Stopwatch } from "@homarr/common";
import { env } from "@homarr/common/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import type { InferInsertModel } from "@homarr/db";
import { and, db, eq, handleTransactionsAsync, inArray, notInArray, or } from "@homarr/db";
import { iconRepositories, icons } from "@homarr/db/schema";
import { fetchIconsAsync } from "@homarr/icons";

import { createCronJob } from "../lib";

const logger = createLogger({ module: "iconsUpdaterJobs" });

export const iconsUpdaterJob = createCronJob("iconsUpdater", EVERY_WEEK, {
  runOnStart: true,
  expectedMaximumDurationInMillis: 10 * 1000,
}).withCallback(async () => {
  if (env.NO_EXTERNAL_CONNECTION) return;

  logger.info("Updating icon repository cache...");
  const stopWatch = new Stopwatch();
  const repositoryIconGroups = await fetchIconsAsync();
  const countIcons = repositoryIconGroups
    .map((group) => group.icons.length)
    .reduce((partialSum, arrayLength) => partialSum + arrayLength, 0);
  logger.info("Fetched icons from repositories", {
    repositoryCount: repositoryIconGroups.length,
    iconCount: countIcons,
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
  });

  const databaseIconRepositories = await db.query.iconRepositories.findMany({
    with: {
      icons: true,
    },
  });

  const skippedChecksums = new Map<string, string[]>();
  let countDeleted = 0;
  let countInserted = 0;

  logger.info("Updating icons in database...");
  stopWatch.reset();

  const newIconRepositories: InferInsertModel<typeof iconRepositories>[] = [];
  const newIcons: InferInsertModel<typeof icons>[] = [];
  const allDbIcons = databaseIconRepositories.flatMap((group) => group.icons);

  for (const repositoryIconGroup of repositoryIconGroups) {
    if (!repositoryIconGroup.success) {
      continue;
    }
    const localSkippedChecksums: string[] = [];

    const repositoryInDb = databaseIconRepositories.find(
      (dbIconGroup) => dbIconGroup.slug === repositoryIconGroup.slug,
    );
    const iconRepositoryId: string = repositoryInDb?.id ?? createId();
    if (!repositoryInDb?.id) {
      newIconRepositories.push({
        id: iconRepositoryId,
        slug: repositoryIconGroup.slug,
      });
    }

    const dbIconsInRepository = allDbIcons.filter((icon) => icon.iconRepositoryId === iconRepositoryId);

    for (const icon of repositoryIconGroup.icons) {
      if (dbIconsInRepository.some((dbIcon) => dbIcon.checksum === icon.checksum)) {
        localSkippedChecksums.push(icon.checksum);
        continue;
      }

      newIcons.push({
        id: createId(),
        checksum: icon.checksum,
        name: icon.fileNameWithExtension,
        url: icon.imageUrl,
        iconRepositoryId,
      });
      countInserted++;
    }

    skippedChecksums.set(iconRepositoryId, localSkippedChecksums);
  }

  const deadIconRepositories = databaseIconRepositories.filter(
    (iconRepository) => !repositoryIconGroups.some((group) => group.slug === iconRepository.slug),
  );

  const deadIconsFilter = or(
    ...[...skippedChecksums.entries()].map(([iconRepositoryId, checksums]) =>
      and(eq(icons.iconRepositoryId, iconRepositoryId), notInArray(icons.checksum, checksums)),
    ),
  );

  await handleTransactionsAsync(db, {
    async handleAsync(db, schema) {
      await db.transaction(async (transaction) => {
        const result = (await transaction.delete(schema.icons).where(deadIconsFilter)) as
          | MySqlRawQueryResult
          | QueryResult;

        countDeleted += Array.isArray(result) ? result[0].affectedRows : (result.rowCount ?? 0);

        if (deadIconRepositories.length >= 1) {
          await transaction.delete(schema.iconRepositories).where(
            inArray(
              iconRepositories.id,
              deadIconRepositories.map((iconRepository) => iconRepository.id),
            ),
          );
        }

        if (newIconRepositories.length >= 1) {
          await transaction.insert(schema.iconRepositories).values(newIconRepositories);
        }

        if (newIcons.length >= 1) {
          // We only insert 5000 icons at a time to avoid SQLite limitations
          for (const chunck of splitToNChunks(newIcons, Math.ceil(newIcons.length / 5000))) {
            await transaction.insert(schema.icons).values(chunck);
          }
        }
      });
    },
    handleSync() {
      db.transaction((transaction) => {
        const result = transaction.delete(icons).where(deadIconsFilter).run();
        countDeleted += result.changes;

        if (deadIconRepositories.length >= 1) {
          transaction
            .delete(iconRepositories)
            .where(
              inArray(
                iconRepositories.id,
                deadIconRepositories.map((iconRepository) => iconRepository.id),
              ),
            )
            .run();
        }

        if (newIconRepositories.length >= 1) {
          transaction.insert(iconRepositories).values(newIconRepositories).run();
        }

        if (newIcons.length >= 1) {
          // We only insert 5000 icons at a time to avoid SQLite limitations
          for (const chunck of splitToNChunks(newIcons, Math.ceil(newIcons.length / 5000))) {
            transaction.insert(icons).values(chunck).run();
          }
        }
      });
    },
  });

  logger.info("Updated icons in database", {
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
    added: countInserted,
    deleted: countDeleted,
  });
});
