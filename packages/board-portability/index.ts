export {
  CONFIG_BUNDLE_FORMAT_VERSION,
  assessBundleCompatibility,
  parseAndValidateBundle,
  parseConfigBundleJson,
} from "./src/config-bundle-compat";
export { USER_DIRECT_FIELDS, USER_REF_FIELDS, GROUP_REF_FIELDS } from "./src/entity-fields";
export { resolveEntities, groupByKey, type EntityResolverDef, type ResolveResult } from "./src/resolve-entities";
export { homarrBundleSchema, homarrConfigBundleSchema, type HomarrBundle, type HomarrConfigBundle, type ConfigBundleUser } from "./src/schema";
export type { ConfigEntityCounts, ConfigEntityKey, ConfigExportPreview, ConfigImportPreview } from "./src/types";
export { CONFIG_ENTITY_KEYS, emptyCounts } from "./src/types";
export { exportBoardBundleAsync, bundleFilenameForBoard } from "./src/export";
export { exportFullConfigAsync } from "./src/export/export-full-config";
export { previewExportFullConfigAsync } from "./src/export/preview-export-full-config";
export { parseBundleJson, importBoardBundleAsync, type BundleImportReport } from "./src/import";
export { importFullConfigAsync, type ConfigImportReport } from "./src/import/import-full-config";
export { previewImportFullConfigAsync } from "./src/import/plan-full-config-import";
export {
  parseServicesYaml,
  importHomepageServicesAsync,
  homepageWidgetMap,
  type HomepageService,
  type HomepageImportReport,
  type ParseServicesYamlResult,
} from "./src/homepage";
