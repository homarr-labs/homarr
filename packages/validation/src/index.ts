import { appSchemas } from "./app";
import { boardSchemas } from "./board";
import { groupSchemas } from "./group";
import { iconsSchemas } from "./icons";
import { integrationSchemas } from "./integration";
import { locationSchemas } from "./location";
import { searchEngineSchemas } from "./search-engine";
import { byIdSchema, paginatedSchema } from "./shared";
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
  common: {
    paginated: paginatedSchema,
    byId: byIdSchema,
  },
};

export {
  createSectionSchema,
  sharedItemSchema,
  itemAdvancedOptionsSchema,
  type BoardItemIntegration,
  type BoardItemAdvancedOptions,
} from "./shared";
export { passwordRequirements } from "./user";
export { oldmarrImportConfigurationSchema, superRefineJsonImportFile } from "./board";
export type { OldmarrImportConfiguration } from "./board";
