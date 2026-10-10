type DbMappingInput = { "better-sqlite3": () => unknown; "node-postgres": () => unknown };

export const createDbMapping = <TInput extends DbMappingInput>(
  input: TInput,
  engine: "sqlite" | "postgresql" = "sqlite",
) => input[engine === "sqlite" ? "better-sqlite3" : "node-postgres"]() as ReturnType<TInput["better-sqlite3"]>;
