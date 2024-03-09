import { appSchemas } from "./app";
import { boardSchemas } from "./board";
import { integrationSchemas } from "./integration";
import { userSchemas } from "./user";

export const validation = {
  user: userSchemas,
  integration: integrationSchemas,
  board: boardSchemas,
  app: appSchemas,
};

export { createSectionSchema, sharedItemSchema } from "./shared";
