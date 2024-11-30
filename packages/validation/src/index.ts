import { appSchemas } from "./app";
import { boardSchemas } from "./board";
import { commonSchemas } from "./common";
import { groupSchemas } from "./group";
import { iconsSchemas } from "./icons";
import { integrationSchemas } from "./integration";
import { locationSchemas } from "./location";
import { mediaSchemas } from "./media";
import { searchEngineSchemas } from "./search-engine";
import { userSchemas } from "./user";
import { widgetSchemas } from "./widgets";

export const validation = {
  user: userSchemas,
  group: groupSchemas,
  integration: integrationSchemas,
  board: boardSchemas,
  app: appSchemas,
  widget: widgetSchemas,
  location: locationSchemas,
  icons: iconsSchemas,
  searchEngine: searchEngineSchemas,
  media: mediaSchemas,
  common: commonSchemas,
};

export { oldmarrImportConfigurationSchema, initialOldmarrImportSettings, superRefineJsonImportFile } from "./board";
export type { OldmarrImportConfiguration, InitialOldmarrImportSettings } from "./board";
export {
  createSectionSchema,
  itemAdvancedOptionsSchema,
  sharedItemSchema,
  type BoardItemAdvancedOptions,
  type BoardItemIntegration,
} from "./shared";
export { passwordRequirements } from "./user";
export { supportedMediaUploadFormats } from "./media";
