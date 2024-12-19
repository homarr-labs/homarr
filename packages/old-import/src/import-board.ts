import type { Database } from "@homarr/db";
import { createId } from "@homarr/db";
import { boards } from "@homarr/db/schema";
import { logger } from "@homarr/log";
import type { OldmarrConfig } from "@homarr/old-schema";

import { mapColor } from "./mappers/map-colors";
import { mapColumnCount } from "./mappers/map-column-count";
import type { OldmarrImportConfiguration } from "./settings";

export const insertBoardAsync = async (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  logger.info(`Importing old homarr board configuration=${old.configProperties.name}`);
  const boardId = createId();
  await db.insert(boards).values({
    id: boardId,
    name: configuration.name,
    backgroundImageAttachment: old.settings.customization.backgroundImageAttachment,
    backgroundImageUrl: old.settings.customization.backgroundImageUrl,
    backgroundImageRepeat: old.settings.customization.backgroundImageRepeat,
    backgroundImageSize: old.settings.customization.backgroundImageSize,
    columnCount: mapColumnCount(old, configuration.screenSize),
    faviconImageUrl: old.settings.customization.faviconUrl,
    isPublic: old.settings.access.allowGuests,
    logoImageUrl: old.settings.customization.logoImageUrl,
    pageTitle: old.settings.customization.pageTitle,
    metaTitle: old.settings.customization.metaTitle,
    opacity: old.settings.customization.appOpacity,
    primaryColor: mapColor(old.settings.customization.colors.primary, "#fa5252"),
    secondaryColor: mapColor(old.settings.customization.colors.secondary, "#fd7e14"),
  });

  logger.info(`Imported board id=${boardId}`);

  return boardId;
};
