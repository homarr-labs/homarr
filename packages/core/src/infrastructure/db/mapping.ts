import { dbEnv } from "./env";

type DbMappingInput = Record<typeof dbEnv.DRIVER, () => unknown>;

export const createDbMapping = <TInput extends DbMappingInput>(input: TInput) => {
  return input[dbEnv.DRIVER]() as ReturnType<TInput["better-sqlite3"]>;
};
