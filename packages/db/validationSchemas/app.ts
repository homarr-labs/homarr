import { createSelectSchema } from "drizzle-zod";
import { apps } from "../schema/sqlite";

export const selectAppSchema = createSelectSchema(apps);