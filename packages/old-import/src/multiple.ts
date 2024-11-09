import { inArray } from "@homarr/db";
import type { Database } from "@homarr/db";
import { apps, boards, items, sections } from "@homarr/db/schema/sqlite";
import { logger } from "@homarr/log";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { getAppsFromOldmarrConfig } from "./apps";
import { prepareMultipleImports } from "./prepare/multiple";

type ImportSpecificConfigurationFields = keyof Pick<OldmarrImportConfiguration, "name" | "screenSize">;

// We do not use async to support transactions
export const importMultiple = (
  db: Database,
  imports: { configuration: Pick<OldmarrImportConfiguration, ImportSpecificConfigurationFields>; old: OldmarrConfig }[],
  configuration: Omit<OldmarrImportConfiguration, ImportSpecificConfigurationFields> & { importIntegrations: boolean },
) => {
  const allApps = imports.map(({ old }) => getAppsFromOldmarrConfig(old)).flat();
  const distinctHrefs = [...new Set(allApps.map((app) => app.href).filter((href) => href !== null))];

  const existingApps = db.query.apps
    .findMany({
      where: inArray(apps.href, distinctHrefs),
    })
    .sync();
  const preparedImports = prepareMultipleImports(imports, configuration, existingApps);

  logger.info(
    `Prepared imports from old configurations boards=${preparedImports.boards.length} sections=${preparedImports.sections.length} apps=${preparedImports.apps.length} items=${preparedImports.items.length}`,
  );

  // Transactions don't work with async/await, see https://github.com/WiseLibs/better-sqlite3/issues/1262 and https://github.com/drizzle-team/drizzle-orm/issues/1723
  db.transaction((transaction) => {
    if (preparedImports.boards.length >= 1) {
      transaction.insert(boards).values(preparedImports.boards).run();
    }

    if (preparedImports.sections.length >= 1) {
      transaction.insert(sections).values(preparedImports.sections).run();
    }

    if (preparedImports.apps.length >= 1) {
      transaction.insert(apps).values(preparedImports.apps).run();
    }

    if (preparedImports.items.length >= 1) {
      transaction.insert(items).values(preparedImports.items).run();
    }
  });

  const importSummary = new Map<string, OldmarrImportConfiguration["screenSize"][]>();
  imports.forEach(({ old, configuration }) => {
    const importSummaryEntry = importSummary.get(old.configProperties.name) ?? [];
    importSummaryEntry.push(configuration.screenSize);
    importSummary.set(old.configProperties.name, importSummaryEntry);
  });

  const listOfImportedBoards = [...importSummary.entries()]
    .map(([name, screenSizes]) => `- ${name}: ${screenSizes.join(", ")}`)
    .join("\n");

  logger.info(
    `Imported old configurations boards=${preparedImports.boards.length} sections=${preparedImports.sections.length} apps=${preparedImports.apps.length} items=${preparedImports.items.length} configurations:\n${listOfImportedBoards}`,
  );
};
