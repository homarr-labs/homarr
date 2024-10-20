import { createSelectSchema } from "drizzle-zod";
import { users } from "../schema/sqlite";

export const selectUserSchema = createSelectSchema(users);