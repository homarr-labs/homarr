import { integrationSchemas } from "./integration";
import { serviceSchemas } from "./service";
import { userSchemas } from "./user";

export const validation = {
  user: userSchemas,
  integration: integrationSchemas,
  service: serviceSchemas,
};
