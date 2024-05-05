import { Stopwatch } from "@homarr/common";
import { db, eq } from "@homarr/db";
import { createId } from "@homarr/db/client";
import { iconRepositories, icons } from "@homarr/db/schema/sqlite";
import { fetchIconsAsync } from "@homarr/icons";
import { logger } from "@homarr/log";

import { EVERY_WEEK } from "~/lib/cron-job/constants";
import { createCronJob } from "~/lib/cron-job/creator";

export const iconsUpdaterJob = createCronJob(EVERY_WEEK, {
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

  const databaseIconGroups = await db.query.iconRepositories.findMany({
    with: {
      icons: true,
    },
  });

  const skippedChecksums: string[] = [];
  let countDeleted = 0;
  let countInserted = 0;

  logger.info("Updating icons in database...");
  stopWatch.reset();

  await db.transaction(async (transaction) => {
    for (const repositoryIconGroup of repositoryIconGroups) {
      if (!repositoryIconGroup.success) {
        continue;
      }

      const repositoryInDb = databaseIconGroups.find(
        (dbIconGroup) => dbIconGroup.slug === repositoryIconGroup.slug,
      );
      const repositoryIconGroupId: string = repositoryInDb?.id ?? createId();
      if (!repositoryInDb?.id) {
        await transaction.insert(iconRepositories).values({
          id: repositoryIconGroupId,
          slug: repositoryIconGroup.slug,
        });
      }

      for (const icon of repositoryIconGroup.icons) {
        if (
          databaseIconGroups
            .flatMap((group) => group.icons)
            .some((dbIcon) => dbIcon.checksum === icon.checksum)
        ) {
          skippedChecksums.push(icon.checksum);
          continue;
        }

        await transaction.insert(icons).values({
          id: createId(),
          checksum: icon.checksum,
          name: icon.fileNameWithExtension,
          url: icon.imageUrl.href,
          iconRepositoryId: repositoryIconGroupId,
        });
        countInserted++;
      }
    }

    const deadIcons = databaseIconGroups
      .flatMap((group) => group.icons)
      .filter((icon) => !skippedChecksums.includes(icon.checksum));

    for (const icon of deadIcons) {
      await transaction.delete(icons).where(eq(icons.checksum, icon.checksum));
      countDeleted++;
    }
  });

  logger.info(
    `Updated database within ${stopWatch.getElapsedInHumanWords()} (-${countDeleted}, +${countInserted})`,
  );
});
