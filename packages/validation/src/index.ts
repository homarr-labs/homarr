import { appSchemas } from "./app";
import { boardSchemas } from "./board";
import { groupSchemas } from "./group";
import { integrationSchemas } from "./integration";
import { locationSchemas } from "./location";
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
};

export { createSectionSchema, sharedItemSchema } from "./shared";
