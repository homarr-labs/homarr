import type { Database } from "../..";
import { migrateReleaseWidgetProviderToOptionsAsync } from "./0000_release_widget_provider_to_options";
import { migrateOpnsenseCredentialsAsync } from "./0001_opnsense_credentials";
import { migrateAppWidgetShowDescriptionTooltipToDisplayModeAsync } from "./0002_app_widget_show_description_tooltip_to_display_mode";
import { migrateWidgetOnlyIntegrationsToOptionsAsync } from "./0003_remove_widget_only_integrations";
import { migrateLegacySectionsToContainersAsync } from "./0004_unify_sections_and_gutters";
import { migrateIconSearchNameAsync } from "./0005_backfill_icon_search_name";

export const applyCustomMigrationsAsync = async (db: Database) => {
  await migrateReleaseWidgetProviderToOptionsAsync(db);
  await migrateOpnsenseCredentialsAsync(db);
  await migrateAppWidgetShowDescriptionTooltipToDisplayModeAsync(db);
  await migrateWidgetOnlyIntegrationsToOptionsAsync(db);
  await migrateLegacySectionsToContainersAsync(db);
  await migrateIconSearchNameAsync(db);
};
