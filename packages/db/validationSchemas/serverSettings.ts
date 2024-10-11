import { createSelectSchema } from "drizzle-zod";
import { serverSettings } from "../schema/sqlite";

export const selectSeverSettingsSchema = createSelectSchema(serverSettings);