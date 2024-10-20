import { createSelectSchema } from "drizzle-zod";
import { boards } from "../schema/sqlite";

export const selectBoardSchema = createSelectSchema(boards);