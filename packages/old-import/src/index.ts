import type { Database } from "@homarr/db";
import type { OldmarrConfig } from "@homarr/old-schema";

import { importSingleOldmarrConfig } from "./import/import-single-oldmarr";
import type { OldmarrImportConfiguration } from "./settings";

export const importOldmarr = (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  importSingleOldmarrConfig(db, old, configuration);
};
