import { createSelectSchema } from "drizzle-zod";
import { groups } from "../schema/sqlite";

export const selectGroupSchema = createSelectSchema(groups);