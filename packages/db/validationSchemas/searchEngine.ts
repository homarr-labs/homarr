import { createSelectSchema } from "drizzle-zod";
import { searchEngines } from "../schema/sqlite";

export const selectSearchEnginesSchema = createSelectSchema(searchEngines);