import { splitToNChunks, Stopwatch } from "@homarr/common";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import type { InferInsertModel } from "@homarr/db";
import { db, inArray, sql } from "@homarr/db";
import { createId } from "@homarr/db/client";
import { iconRepositories, icons } from "@homarr/db/schema";
import { fetchIconsAsync } from "@homarr/icons";
import { logger } from "@homarr/log";

import { createCronJob } from "../lib";

export const iconsUpdaterJob = createCronJob("iconsUpdater", EVERY_WEEK, {
  runOnStart: true,
}).withCallback(async () => {
  logger.info("Updating icon repository cache...");
  const stopWatch = new Stopwatch();
  const repositoryIconGroups = await fetchIconsAsync();
  const countIcons = repositoryIconGroups
    .map((group) => group.icons.length)
    .reduce((partialSum, arrayLength) => partialSum + arrayLength, 0);
  logger.info(
    `Successfully fetched ${countIcons} icons from ${repositoryIconGroups.length} repositories within ${stopWatch.getElapsedInHumanWords()}`,
  );

  const databaseIconRepositories = await db.query.iconRepositories.findMany({
    with: {
      icons: true,
    },
  });

  const skippedChecksums: `${string}.${string}`[] = [];
  let countDeleted = 0;
  let countInserted = 0;

  logger.info("Updating icons in database...");
  stopWatch.reset();

  const newIconRepositories: InferInsertModel<typeof iconRepositories>[] = [];
  const newIcons: InferInsertModel<typeof icons>[] = [];

  for (const repositoryIconGroup of repositoryIconGroups) {
    if (!repositoryIconGroup.success) {
      continue;
    }

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

    for (const icon of repositoryIconGroup.icons) {
      if (
        databaseIconRepositories
          .flatMap((repository) => repository.icons)
          .some((dbIcon) => dbIcon.checksum === icon.checksum && dbIcon.iconRepositoryId === iconRepositoryId)
      ) {
        skippedChecksums.push(`${iconRepositoryId}.${icon.checksum}`);
        continue;
      }

      newIcons.push({
        id: createId(),
        checksum: icon.checksum,
        name: icon.fileNameWithExtension,
        url: icon.imageUrl,
        iconRepositoryId: iconRepositoryId,
      });
      countInserted++;
    }
  }

  const deadIcons = databaseIconRepositories
    .flatMap((repository) => repository.icons)
    .filter((icon) => !skippedChecksums.includes(`${icon.iconRepositoryId}.${icon.checksum}`));

  const deadIconRepositories = databaseIconRepositories.filter(
    (iconRepository) => !repositoryIconGroups.some((group) => group.slug === iconRepository.slug),
  );

  db.transaction((transaction) => {
    if (newIconRepositories.length >= 1) {
      transaction.insert(iconRepositories).values(newIconRepositories).run();
    }

    if (newIcons.length >= 1) {
      // We only insert 5000 icons at a time to avoid SQLite limitations
      for (const chunck of splitToNChunks(newIcons, Math.ceil(newIcons.length / 5000))) {
        transaction.insert(icons).values(chunck).run();
      }
    }
    if (deadIcons.length >= 1) {
      transaction
        .delete(icons)
        .where(
          inArray(
            // Combine iconRepositoryId and checksum to allow same icons on different repositories
            sql`concat(${icons.iconRepositoryId}, '.', ${icons.checksum})`,
            deadIcons.map((icon) => `${icon.iconRepositoryId}.${icon.checksum}`),
          ),
        )
        .run();
    }

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

    countDeleted += deadIcons.length;
  });

  logger.info(`Updated database within ${stopWatch.getElapsedInHumanWords()} (-${countDeleted}, +${countInserted})`);
});
