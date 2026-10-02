import { createSchema } from "../../../db";
import * as postgresql from "./postgresql";
import * as sqlite from "./sqlite";

export const schema = createSchema({
  "bun-sqlite": () => sqlite,
  "node-postgres": () => postgresql,
});
