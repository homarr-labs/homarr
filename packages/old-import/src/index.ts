import { inArray } from "@homarr/db";
import type { Database } from "@homarr/db";
import { apps, boards, items, sections } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { getAppsFromOldmarrConfig } from "./apps";
import { prepareImport } from "./prepare";

export const importAsync = async (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  const allApps = getAppsFromOldmarrConfig(old);
  const distinctHrefs = [...new Set(allApps.map((app) => app.href).filter((href) => href !== null))];

  const existingApps = await db.query.apps.findMany({
    where: inArray(apps.href, distinctHrefs),
  });
  const preparedImport = prepareImport(old, configuration, existingApps);

  // Transactions don't work with async/await, see https://github.com/WiseLibs/better-sqlite3/issues/1262 and https://github.com/drizzle-team/drizzle-orm/issues/1723
  db.transaction((transaction) => {
    if (preparedImport.boards.length >= 1) {
      transaction.insert(boards).values(preparedImport.boards).run();
    }

    if (preparedImport.sections.length >= 1) {
      transaction.insert(sections).values(preparedImport.sections).run();
    }

    if (preparedImport.apps.length >= 1) {
      transaction.insert(apps).values(preparedImport.apps).run();
    }

    if (preparedImport.items.length >= 1) {
      transaction.insert(items).values(preparedImport.items).run();
    }
  });

  logger.info(
    `Imported old configuration name='${old.configProperties.name}' boards=${preparedImport.boards.length} sections=${preparedImport.sections.length} apps=${preparedImport.apps.length} items=${preparedImport.items.length}`,
  );
};
