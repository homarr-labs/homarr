import type { Database } from "@homarr/db";
import type { OldmarrConfig } from "@homarr/old-schema";
import type { OldmarrImportConfiguration } from "@homarr/validation";

import { importSingleOldmarrConfig } from "./import/import-single-oldmarr";

export const importOldmarr = (db: Database, old: OldmarrConfig, configuration: OldmarrImportConfiguration) => {
  importSingleOldmarrConfig(db, old, configuration);
};
