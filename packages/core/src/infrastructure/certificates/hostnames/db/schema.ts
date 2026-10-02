import { createSchema } from "../../../db";
import * as postgresql from "./postgresql";
import * as sqlite from "./sqlite";

export const schema = createSchema({
  "better-sqlite3": () => sqlite,
  "node-postgres": () => postgresql,
});
