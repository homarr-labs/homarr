import { createSelectSchema } from "drizzle-zod";
import { invites } from "../schema/sqlite";

export const selectInviteSchema = createSelectSchema(invites);