import { appSchemas } from "./app";
import { boardSchemas } from "./board";
import { certificateSchemas } from "./certificates";
import { commonSchemas } from "./common";
import { groupSchemas } from "./group";
import { iconsSchemas } from "./icons";
import { integrationSchemas } from "./integration";
import { locationSchemas } from "./location";
import { mediaSchemas } from "./media";
import { searchEngineSchemas } from "./search-engine";
import { settingsSchemas } from "./settings";
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
  settings: settingsSchemas,
  common: commonSchemas,
  certificates: certificateSchemas,
};

export {
  sectionSchema,
  itemAdvancedOptionsSchema,
  sharedItemSchema,
  type BoardItemAdvancedOptions,
  type BoardItemIntegration,
} from "./shared";
export { superRefineCertificateFile } from "./certificates";
export { passwordRequirements } from "./user";
export { supportedMediaUploadFormats } from "./media";
export { zodEnumFromArray, zodUnionFromArray } from "./enums";
