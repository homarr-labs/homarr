import { createId, splitToChunksWithNItems, Stopwatch } from "@homarr/common";
import { env } from "@homarr/common/env";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { EVERY_WEEK } from "@homarr/cron-jobs-core/expressions";
import type { InferInsertModel, SQL } from "@homarr/db";
import { db, executeWritePlanAsync, inArray } from "@homarr/db";
import { iconRepositories, icons, serverSettings } from "@homarr/db/schema";
import { fetchIconsAsync, getIconCatalogStateAsync, iconCatalogSettingKey } from "@homarr/icons";
import { createLockChannel } from "@homarr/redis";

import { createCronJob } from "../lib";

const logger = createLogger({ module: "iconsUpdaterJobs" });
const lock = createLockChannel("icons-updater:lock");

export const iconsUpdaterJob = createCronJob("iconsUpdater", EVERY_WEEK, {
  runOnStart: true,
  expectedMaximumDurationInMillis: 10 * 1000,
}).withCallback(async () => {
  if (env.NO_EXTERNAL_CONNECTION) return;

  const token = await lock.acquireAsync(120);
  if (token === null) return;
  try {
    await refreshIconsAsync();
  } finally {
    await lock.releaseAsync(token);
  }
});

async function refreshIconsAsync() {
  logger.info("Updating icon repository cache...");
  const stopWatch = new Stopwatch();
  const [state, repositories] = await Promise.all([getIconCatalogStateAsync(db), db.query.iconRepositories.findMany()]);
  const etags: Record<string, string> = {};
  for (const { slug } of repositories) {
    const etag = state?.etags[slug];
    if (etag !== undefined) etags[slug] = etag;
  }

  const groups = await fetchIconsAsync(etags);
  const refreshed = groups.filter((group) => group.status === "updated");
  logger.info("Fetched icons from repositories", {
    repositoryCount: groups.length,
    iconCount: refreshed.reduce((count, group) => count + group.icons.length, 0),
    unchanged: groups.filter((group) => group.status === "unchanged").length,
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
  });

  stopWatch.reset();
  const activeSlugs = new Set(groups.map((group) => group.slug));
  const refreshedSlugs = new Set(refreshed.map((group) => group.slug));
  const removedRepositories = repositories.filter((repository) => !activeSlugs.has(repository.slug));
  const refreshedIds = repositories.filter((repository) => refreshedSlugs.has(repository.slug)).map(({ id }) => id);
  const currentIcons = await db.query.icons.findMany({
    columns: { id: true, checksum: true, iconRepositoryId: true },
    where: inArray(icons.iconRepositoryId, refreshedIds),
  });
  const iconsByRepository = Map.groupBy(currentIcons, (icon) => icon.iconRepositoryId);
  const newRepositories: InferInsertModel<typeof iconRepositories>[] = [];
  const newIcons: InferInsertModel<typeof icons>[] = [];
  const removedIconIds: string[] = [];
  let catalogChanged = removedRepositories.some((repository) => repository.slug !== "local");

  for (const repository of removedRepositories) delete etags[repository.slug];

  for (const group of refreshed) {
    const matchingRepository = repositories.find((repository) => repository.slug === group.slug);
    const iconRepositoryId = matchingRepository?.id ?? createId();
    if (!matchingRepository) newRepositories.push({ id: iconRepositoryId, slug: group.slug });

    const persisted = iconsByRepository.get(iconRepositoryId) ?? [];
    const incomingChecksums = new Set(group.icons.map((icon) => icon.checksum));
    const persistedChecksums = new Set(persisted.map((icon) => icon.checksum));
    const removed = persisted.filter((icon) => !incomingChecksums.has(icon.checksum));
    const added = group.icons.filter((icon) => !persistedChecksums.has(icon.checksum));

    if (group.slug !== "local" && (!matchingRepository || removed.length > 0 || added.length > 0)) {
      catalogChanged = true;
    }
    for (const icon of removed) removedIconIds.push(icon.id);
    for (const icon of added) {
      newIcons.push({
        id: createId(),
        checksum: icon.checksum,
        name: icon.fileNameWithExtension,
        url: icon.imageUrl,
        iconRepositoryId,
      });
    }
    if (group.etag === undefined) delete etags[group.slug];
    else etags[group.slug] = group.etag;
  }

  const plan: SQL[] = [];
  if (removedRepositories.length > 0) {
    plan.push(
      db
        .delete(iconRepositories)
        .where(
          inArray(
            iconRepositories.id,
            removedRepositories.map(({ id }) => id),
          ),
        )
        .getSQL(),
    );
  }
  if (newRepositories.length > 0) plan.push(db.insert(iconRepositories).values(newRepositories).getSQL());
  // Keep both deletes and inserts below the SQLite parameter limit as catalogs grow.
  for (const ids of splitToChunksWithNItems(removedIconIds, 5000)) {
    plan.push(db.delete(icons).where(inArray(icons.id, ids)).getSQL());
  }
  for (const chunk of splitToChunksWithNItems(newIcons, 5000)) {
    plan.push(db.insert(icons).values(chunk).getSQL());
  }

  let revision = state?.revision;
  if (catalogChanged || revision === undefined) revision = createId();
  const value = JSON.stringify({ revision, etags });
  if (value !== JSON.stringify(state)) {
    // Commit the validators and cache revision together with the catalog rows.
    plan.push(
      db
        .insert(serverSettings)
        .values({ settingKey: iconCatalogSettingKey, value })
        .onConflictDoUpdate({ target: serverSettings.settingKey, set: { value } })
        .getSQL(),
    );
  }

  await executeWritePlanAsync(db, plan);

  logger.info("Updated icons in database", {
    duration: stopWatch.getElapsedInFormattedMilliseconds(),
    added: newIcons.length,
    deleted: removedIconIds.length,
  });
}
