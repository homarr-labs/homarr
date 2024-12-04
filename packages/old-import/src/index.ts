import type { Database } from "@homarr/db";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { importSingleOldmarrConfigAsync } from "./import/import-single-oldmarr";

export const importAsync = async (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  await importSingleOldmarrConfigAsync(db, old, configuration);
};
