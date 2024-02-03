import { boardSchemas } from "./board";
import { integrationSchemas } from "./integration";
import { userSchemas } from "./user";

export const validation = {
  user: userSchemas,
  integration: integrationSchemas,
  board: boardSchemas,
};

export { createSectionSchema, sharedItemSchema } from "./shared";
