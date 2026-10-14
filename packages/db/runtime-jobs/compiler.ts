import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { RuntimeJobSqlStatement, RuntimeJobSqlValue } from "./types";

type Token =
  | { kind: "word"; value: string }
  | { kind: "identifier"; value: string }
  | { kind: "literal"; value: string }
  | { kind: "parameter"; slot: number }
  | { kind: "symbol"; value: string };

const words = {
  SELECT: "SELECT",
  FROM: "FROM",
  WHERE: "WHERE",
  AS: "AS",
  COUNT: "count",
  DISTINCT: "DISTINCT",
  GROUP: "GROUP",
  BY: "BY",
  INNER: "INNER",
  JOIN: "JOIN",
  ON: "ON",
  INSERT: "INSERT",
  INTO: "INTO",
  VALUES: "VALUES",
  CONFLICT: "CONFLICT",
  DO: "DO",
  UPDATE: "UPDATE",
  SET: "SET",
  EXCLUDED: "excluded",
  RETURNING: "RETURNING",
  DELETE: "DELETE",
  AND: "AND",
  OR: "OR",
  NOT: "NOT",
  IN: "IN",
} as const;

const symbols = { "(": "(", ")": ")", ",": ",", ".": ".", "=": "=", "*": "*" } as const;

const identifiers = new Set([
  "name",
  "cron_expression",
  "is_enabled",
  "cron_job_configuration",
  "value",
  "setting_key",
  "serverSetting",
  "count",
  "board",
  "is_public",
  "disable_status",
  "group",
  "app",
  "section",
  "search_engine",
  "iconRepository",
  "icon",
  "layout",
  "item_layout",
  "section_layout",
  "custom_widget_v2_definition",
  "trusted_certificate_hostname",
  "user",
  "apiKey",
  "invite",
  "media",
  "session",
  "account",
  "kind",
  "id",
  "integration",
  "item",
  "board_id",
  "integration_item",
  "integration_id",
  "item_id",
  "role",
  "slug",
  "checksum",
  "url",
  "icon_repository_id",
  "user_id",
  "provider",
]);

const countTables = [
  "board",
  "group",
  "app",
  "section",
  "search_engine",
  "iconRepository",
  "icon",
  "layout",
  "item_layout",
  "section_layout",
  "cron_job_configuration",
  "custom_widget_v2_definition",
  "trusted_certificate_hostname",
  "user",
  "apiKey",
  "invite",
  "media",
  "session",
  "account",
];

const tokenize = (text: string, dialect: "sqlite" | "postgresql"): Token[] => {
  const tokens: Token[] = [];
  let index = 0;
  let positional = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === undefined) break;
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if (text.startsWith("--", index)) {
      const end = text.indexOf("\n", index + 2);
      index = end < 0 ? text.length : end + 1;
      continue;
    }
    if (text.startsWith("/*", index)) {
      let depth = 1;
      index += 2;
      while (index < text.length && depth > 0) {
        if (text.startsWith("/*", index)) {
          if (dialect === "sqlite") throw new TypeError("Nested SQLite SQL comments are unsupported");
          depth += 1;
          index += 2;
        } else if (text.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else index += 1;
      }
      if (depth !== 0) throw new TypeError("Unterminated jobs SQL comment");
      continue;
    }
    if (character === "'" || character === '"') {
      const quote = character;
      let value = "";
      let closed = false;
      index += 1;
      while (index < text.length) {
        const next = text[index++];
        if (next === "\\" || next === "\0") throw new TypeError("Unsupported jobs SQL quoting");
        if (next === quote) {
          if (text[index] === quote) {
            value += quote;
            index += 1;
          } else {
            closed = true;
            break;
          }
        } else value += next;
      }
      if (!closed) throw new TypeError("Unterminated jobs SQL quote");
      if (quote === '"' && !identifiers.has(value)) throw new TypeError("Untrusted jobs SQL identifier");
      tokens.push({ kind: quote === '"' ? "identifier" : "literal", value });
      continue;
    }
    if (character === "$") {
      if (dialect !== "postgresql") throw new TypeError("PostgreSQL placeholder in SQLite jobs SQL");
      const rest = text.slice(index);
      const delimiter = rest.match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
      if (delimiter) {
        const end = text.indexOf(delimiter, index + delimiter.length);
        if (end < 0) throw new TypeError("Unterminated jobs SQL dollar quote");
        const value = text.slice(index + delimiter.length, end);
        if (value.includes("\0")) throw new TypeError("Invalid jobs SQL literal");
        tokens.push({ kind: "literal", value });
        index = end + delimiter.length;
        continue;
      }
      const placeholder = rest.match(/^\$([1-9][0-9]*)/);
      if (!placeholder) throw new TypeError("Malformed jobs SQL numbered placeholder");
      const slot = Number(placeholder[1]);
      if (!Number.isSafeInteger(slot)) throw new TypeError("Invalid jobs SQL parameter slot");
      index += placeholder[0].length;
      if (/[A-Za-z_0-9$]/.test(text[index] ?? "")) throw new TypeError("Malformed jobs SQL parameter boundary");
      tokens.push({ kind: "parameter", slot });
      continue;
    }
    if (character === "?") {
      if (dialect !== "sqlite") throw new TypeError("SQLite placeholder in PostgreSQL jobs SQL");
      index += 1;
      if (/[A-Za-z_0-9?$]/.test(text[index] ?? "")) throw new TypeError("Malformed jobs SQL positional placeholder");
      positional += 1;
      tokens.push({ kind: "parameter", slot: positional });
      continue;
    }
    if (character === ";") {
      if (text.slice(index + 1).trim() !== "") throw new TypeError("Multiple jobs SQL statements are forbidden");
      index = text.length;
      continue;
    }
    if (Object.hasOwn(symbols, character)) {
      tokens.push({ kind: "symbol", value: symbols[character as keyof typeof symbols] });
      index += 1;
      continue;
    }
    const word = text.slice(index).match(/^[A-Za-z_][A-Za-z_0-9]*/)?.[0];
    if (!word || !Object.hasOwn(words, word.toUpperCase())) throw new TypeError("Unsupported jobs SQL syntax");
    tokens.push({ kind: "word", value: word.toUpperCase() });
    index += word.length;
  }
  if (tokens.length === 0) throw new TypeError("Empty jobs SQL statement");
  return tokens;
};

const shape = (tokens: readonly Token[]) =>
  tokens
    .map((token) => {
      if (token.kind === "parameter" || token.kind === "literal") return "?";
      if (token.kind === "identifier") return JSON.stringify(token.value);
      return token.value;
    })
    .join(" ");

const trustedShape = (text: string) => shape(tokenize(text, "sqlite"));

const fixedReads = new Set(
  [
    'SELECT "name", "cron_expression", "is_enabled" FROM "cron_job_configuration"',
    'SELECT "value" FROM "serverSetting" WHERE "setting_key" = ?',
    'SELECT "kind", count("id") AS "count" FROM "integration" GROUP BY "kind"',
    'SELECT "kind", count("id") AS "count" FROM "item" GROUP BY "kind"',
    'SELECT "kind", count(DISTINCT "board_id") AS "count" FROM "item" GROUP BY "kind"',
    'SELECT "integration"."kind" AS "kind", count(DISTINCT "item"."board_id") AS "count" FROM "integration_item" INNER JOIN "integration" ON "integration_item"."integration_id" = "integration"."id" INNER JOIN "item" ON "integration_item"."item_id" = "item"."id" GROUP BY "integration"."kind"',
    'SELECT "role" AS "kind", count("id") AS "count" FROM "layout" GROUP BY "role"',
    'SELECT "kind", count("id") AS "count" FROM "section" GROUP BY "kind"',
    'SELECT "board_id", count("id") AS "count" FROM "item" GROUP BY "board_id"',
    'SELECT "id", "slug" FROM "iconRepository"',
    'SELECT "id", "checksum", "name", "url", "icon_repository_id" FROM "icon"',
    ...countTables.map((table) => `SELECT count(*) AS "count" FROM "${table}"`),
    'SELECT count(*) AS "count" FROM "board" WHERE "is_public" = ?',
    'SELECT count(*) AS "count" FROM "board" WHERE "disable_status" = ?',
  ].map(trustedShape),
);

const configurationPrefix =
  'INSERT INTO "cron_job_configuration" ("name", "cron_expression", "is_enabled") VALUES (?, ?, ?) ON CONFLICT ("name") DO UPDATE SET ';
const configurationSuffix = ' RETURNING "name", "cron_expression", "is_enabled"';
const fixedReturningWrites = new Set(
  [
    'UPDATE "serverSetting" SET "value" = ? WHERE "setting_key" = ? AND "value" = ? RETURNING "setting_key"',
    ...[
      '"cron_expression" = excluded."cron_expression"',
      '"is_enabled" = excluded."is_enabled"',
      '"cron_expression" = excluded."cron_expression", "is_enabled" = excluded."is_enabled"',
    ].map((update) => configurationPrefix + update + configurationSuffix),
  ].map(trustedShape),
);

const dynamicKind = (tokens: readonly Token[]): { kind: "write"; returnsRows: boolean } | null => {
  const values = shape(tokens).split(" ");
  let index = 0;
  const take = (...parts: string[]) => {
    if (!parts.every((part, offset) => values[index + offset] === part)) return false;
    index += parts.length;
    return true;
  };
  const expectTokens = (...parts: string[]) => {
    if (!take(...parts)) throw new TypeError("Untrusted jobs SQL grammar");
  };
  const valueList = () => {
    expectTokens("(", "?");
    while (take(",")) expectTokens("?");
    expectTokens(")");
  };
  const finish = (returnsRows: boolean) => {
    if (index !== values.length) throw new TypeError("Untrusted trailing jobs SQL grammar");
    return { kind: "write" as const, returnsRows };
  };
  if (take("DELETE", "FROM", '"icon"')) {
    if (take("WHERE")) {
      do {
        expectTokens("(", '"icon_repository_id"', "=", "?");
        if (take("AND")) {
          expectTokens('"checksum"', "NOT", "IN");
          valueList();
        }
        expectTokens(")");
      } while (take("OR"));
    }
    return finish(false);
  }
  if (take("DELETE", "FROM", '"iconRepository"', "WHERE", '"id"', "IN")) {
    valueList();
    return finish(false);
  }
  if (
    take(
      "DELETE",
      "FROM",
      '"session"',
      "WHERE",
      '"user_id"',
      "IN",
      "(",
      "SELECT",
      '"id"',
      "FROM",
      '"user"',
      "WHERE",
      '"provider"',
      "IN",
    )
  ) {
    valueList();
    expectTokens(")", "RETURNING", '"user_id"');
    return finish(true);
  }
  if (take("INSERT", "INTO")) {
    let columns: number;
    if (take('"iconRepository"')) {
      expectTokens("(", '"id"', ",", '"slug"', ")", "VALUES");
      columns = 2;
    } else if (take('"icon"')) {
      expectTokens(
        "(",
        '"id"',
        ",",
        '"checksum"',
        ",",
        '"name"',
        ",",
        '"url"',
        ",",
        '"icon_repository_id"',
        ")",
        "VALUES",
      );
      columns = 5;
    } else return null;
    do {
      expectTokens("(", "?");
      for (let column = 1; column < columns; column++) expectTokens(",", "?");
      expectTokens(")");
    } while (take(","));
    return finish(false);
  }
  return null;
};

export interface CompiledRuntimeJobStatement {
  query: SQL;
  kind: "read" | "write";
  returnsRows: boolean;
  bytes: number;
}

export const compileRuntimeJobStatement = (
  statement: RuntimeJobSqlStatement,
  dialect: "sqlite" | "postgresql",
  limits: { maxStatementBytes: number; maxParametersPerStatement: number },
): CompiledRuntimeJobStatement => {
  if (typeof statement.sql !== "string" || !Array.isArray(statement.parameters))
    throw new TypeError("Invalid jobs SQL statement");
  const statementBytes = Buffer.byteLength(statement.sql);
  if (statementBytes > limits.maxStatementBytes) throw new RangeError("Jobs SQL statement byte limit exceeded");
  if (statement.parameters.length > limits.maxParametersPerStatement)
    throw new RangeError("Jobs SQL parameter limit exceeded");
  const parameters: RuntimeJobSqlValue[] = statement.parameters.map((value) => {
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string" && !value.includes("\0")) return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    throw new TypeError("Unsupported jobs SQL parameter value");
  });
  const tokens = tokenize(statement.sql, dialect);
  const normalized = shape(tokens);
  const classification = fixedReads.has(normalized)
    ? { kind: "read" as const, returnsRows: true }
    : fixedReturningWrites.has(normalized)
      ? { kind: "write" as const, returnsRows: true }
      : dynamicKind(tokens);
  if (!classification) throw new TypeError("Jobs SQL is outside the trusted source grammar");
  const used = new Set<number>();
  let bindings = 0;
  let bytes = statementBytes;
  const chunks: SQL[] = [];
  for (const token of tokens) {
    chunks.push(sql` `);
    if (token.kind === "parameter" || token.kind === "literal") {
      let value: RuntimeJobSqlValue;
      if (token.kind === "parameter") {
        if (token.slot > parameters.length) throw new TypeError("Unbound jobs SQL parameter");
        const parameter = parameters[token.slot - 1];
        if (parameter === undefined) throw new TypeError("Unbound jobs SQL parameter");
        used.add(token.slot);
        value = parameter;
      } else value = token.value;
      bindings += 1;
      if (bindings > limits.maxParametersPerStatement) throw new RangeError("Expanded jobs SQL binding limit exceeded");
      bytes += typeof value === "string" ? Buffer.byteLength(value) : 8;
      chunks.push(sql`${dialect === "sqlite" && typeof value === "boolean" ? Number(value) : value}`);
    } else if (token.kind === "identifier") chunks.push(sql`${sql.identifier(token.value)}`);
    else if (token.kind === "word") chunks.push(sql.raw(words[token.value as keyof typeof words]));
    else chunks.push(sql.raw(symbols[token.value as keyof typeof symbols]));
  }
  if (used.size !== parameters.length) throw new TypeError("Unused or missing jobs SQL parameter slots");
  return { ...classification, query: sql.join(chunks), bytes };
};
