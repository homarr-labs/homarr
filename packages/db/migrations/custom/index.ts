import type { Database } from "../..";
import { migrateReleaseWidgetProviderToOptionsAsync } from "./0000_release_widget_provider_to_options";

export const applyCustomMigrationsAsync = async (db: Database) => {
  await migrateReleaseWidgetProviderToOptionsAsync(db);
};
