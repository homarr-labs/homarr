/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { is } from "drizzle-orm";
import type { Column, InferSelectModel } from "drizzle-orm";
import { MySqlTable, getTableConfig as getMysqlTableConfig } from "drizzle-orm/mysql-core";
import type { ForeignKey as MysqlForeignKey, MySqlTableWithColumns } from "drizzle-orm/mysql-core";
import type { PgTableWithColumns, ForeignKey as PostgresqlForeignKey } from "drizzle-orm/pg-core";
import { SQLiteTable, getTableConfig as getSqliteTableConfig } from "drizzle-orm/sqlite-core";
import type { ForeignKey as SqliteForeignKey, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { expect, expectTypeOf, test } from "vitest";

import { objectEntries } from "@homarr/common";

import * as mysqlSchema from "../schema/mysql";
import * as postgresqlSchema from "../schema/postgresql";
import * as sqliteSchema from "../schema/sqlite";

const mysqlTables = { ...mysqlSchema };
const postgresqlTables = { ...postgresqlSchema };

// We need the following three types as there is currently no support for Buffer in mysql & pg and
// so we use a custom type which results in the config beeing different
type FixedMysqlConfig = {
  [key in keyof MysqlConfig]: {
    [column in keyof MysqlConfig[key]]: {
      [property in Exclude<keyof MysqlConfig[key][column], "dataType" | "data">]: MysqlConfig[key][column][property];
    } & {
      dataType: MysqlConfig[key][column]["data"] extends Buffer ? "buffer" : MysqlConfig[key][column]["dataType"];
      data: MysqlConfig[key][column]["data"] extends Buffer ? Buffer : MysqlConfig[key][column]["data"];
    };
  };
};

type FixedPostgresqlConfig = {
  [key in keyof PostgreisqlConfig]: {
    [column in keyof PostgreisqlConfig[key]]: {
      [property in Exclude<
        keyof PostgreisqlConfig[key][column],
        "dataType" | "data"
      >]: PostgreisqlConfig[key][column][property];
    } & {
      dataType: PostgreisqlConfig[key][column]["data"] extends Buffer
        ? "buffer"
        : PostgreisqlConfig[key][column]["dataType"];
      data: PostgreisqlConfig[key][column]["data"] extends Buffer ? Buffer : PostgreisqlConfig[key][column]["data"];
    };
  };
};

type FixedSqliteConfig = {
  [key in keyof SqliteConfig]: {
    [column in keyof SqliteConfig[key]]: {
      [property in Exclude<keyof SqliteConfig[key][column], "dataType" | "data">]: SqliteConfig[key][column][property];
    } & {
      dataType: SqliteConfig[key][column]["dataType"] extends Buffer ? "buffer" : SqliteConfig[key][column]["dataType"];
      data: SqliteConfig[key][column]["data"] extends Buffer ? Buffer : SqliteConfig[key][column]["data"];
    };
  };
};

/** Identifies a foreign key by what it links rather than by its generated name. */
const referenceSignature = (foreignKey: {
  reference: () => { columns: { name: string }[]; foreignTable: object; foreignColumns: { name: string }[] };
}) => {
  const reference = foreignKey.reference();
  const target = Object.keys(reference.foreignTable).sort().join("+");
  return `${reference.columns
    .map((column) => column.name)
    .sort()
    .join(",")}->${target}(${reference.foreignColumns
    .map((column) => column.name)
    .sort()
    .join(",")})`;
};

test("schemas should match", () => {
  expectTypeOf<SqliteTables>().toEqualTypeOf<MysqlTables>();
  expectTypeOf<MysqlTables>().toEqualTypeOf<SqliteTables>();
  expectTypeOf<FixedSqliteConfig>().toEqualTypeOf<FixedMysqlConfig>();
  expectTypeOf<FixedMysqlConfig>().toEqualTypeOf<FixedSqliteConfig>();

  objectEntries(sqliteSchema).forEach(([tableName, sqliteTable]) => {
    Object.entries(sqliteTable).forEach(([columnName, sqliteColumn]: [string, object]) => {
      if (!("isUnique" in sqliteColumn)) return;
      if (!("uniqueName" in sqliteColumn)) return;
      if (!("primary" in sqliteColumn)) return;

      const mysqlTable = mysqlTables[tableName];

      const mysqlColumn = mysqlTable[columnName as keyof typeof mysqlTable] as object;
      if (!("isUnique" in mysqlColumn)) return;
      if (!("uniqueName" in mysqlColumn)) return;
      if (!("primary" in mysqlColumn)) return;

      expect(
        sqliteColumn.isUnique,
        `expect unique of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(mysqlColumn.isUnique);
      expect(
        sqliteColumn.uniqueName,
        `expect uniqueName of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(mysqlColumn.uniqueName);
      expect(
        sqliteColumn.primary,
        `expect primary of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(mysqlColumn.primary);
    });

    const mysqlTable = mysqlTables[tableName];
    // Read through getTableConfig so keys declared at table level count too, not just inline
    // `.references()` ones. MySQL needs a table-level declaration wherever drizzle's derived name
    // would exceed its 64-character identifier limit.
    if (!is(sqliteTable, SQLiteTable) || !is(mysqlTable, MySqlTable)) return;

    const sqliteForeignKeys = getSqliteTableConfig(sqliteTable).foreignKeys as SqliteForeignKey[];
    const mysqlForeignKeys = getMysqlTableConfig(mysqlTable).foreignKeys as MysqlForeignKey[];

    if (sqliteForeignKeys.length === 0 && mysqlForeignKeys.length === 0) return;

    expect(
      sqliteForeignKeys.length,
      `expect number of foreign keys in table ${tableName} to be the same for both schemas`,
    ).toEqual(mysqlForeignKeys.length);

    sqliteForeignKeys.forEach((sqliteForeignKey) => {
      const describeKey = `${tableName}.${referenceSignature(sqliteForeignKey)}`;
      // Matched on what the key actually does rather than on its generated name, because the name
      // is allowed to differ per dialect.
      const mysqlForeignKey = mysqlForeignKeys.find(
        (key) => referenceSignature(key) === referenceSignature(sqliteForeignKey),
      );
      expect(mysqlForeignKey, `expect foreign key ${describeKey} to be defined in mysql schema`).toBeDefined();

      expect(
        sqliteForeignKey.onDelete,
        `expect foreign key (${describeKey}) onDelete to be the same for both schemas`,
      ).toEqual(mysqlForeignKey!.onDelete);

      expect(
        sqliteForeignKey.onUpdate,
        `expect foreign key (${describeKey}) onUpdate to be the same for both schemas`,
      ).toEqual(mysqlForeignKey!.onUpdate);
    });
  });
});

test("mysql identifiers stay within the 64 character limit", () => {
  // MySQL rejects longer identifiers with error 1059, and drizzle derives foreign key names from
  // the table and column names, so a long pairing silently produces a migration that cannot apply.
  const tooLong: string[] = [];

  objectEntries(mysqlSchema).forEach(([, table]) => {
    if (!is(table, MySqlTable)) return;

    const config = getMysqlTableConfig(table);
    if (config.name.length > 64) tooLong.push(config.name);
    for (const foreignKey of config.foreignKeys) {
      if (foreignKey.getName().length > 64) tooLong.push(foreignKey.getName());
    }
    for (const index of config.indexes) {
      if (index.config.name.length > 64) tooLong.push(index.config.name);
    }
  });

  expect(tooLong).toEqual([]);
});

test("schemas should match for postgresql", () => {
  expectTypeOf<SqliteTables>().toEqualTypeOf<PostgresqlTables>();
  expectTypeOf<PostgresqlTables>().toEqualTypeOf<SqliteTables>();
  expectTypeOf<FixedSqliteConfig>().toEqualTypeOf<FixedPostgresqlConfig>();
  expectTypeOf<FixedPostgresqlConfig>().toEqualTypeOf<FixedSqliteConfig>();

  objectEntries(sqliteSchema).forEach(([tableName, sqliteTable]) => {
    // keys of sqliteSchema and postgresqlSchema are the same, so we can safely use tableName as key
    // skipcq: JS-E1007
    const postgresqlTable = postgresqlTables[tableName];
    Object.entries(sqliteTable).forEach(([columnName, sqliteColumn]: [string, object]) => {
      if (!("isUnique" in sqliteColumn)) return;
      if (!("uniqueName" in sqliteColumn)) return;
      if (!("primary" in sqliteColumn)) return;

      const postgresqlColumn = postgresqlTable[columnName as keyof typeof postgresqlTable] as object;
      if (!("isUnique" in postgresqlColumn)) return;
      if (!("uniqueName" in postgresqlColumn)) return;
      if (!("primary" in postgresqlColumn)) return;

      expect(
        sqliteColumn.isUnique,
        `expect unique of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(postgresqlColumn.isUnique);
      expect(
        sqliteColumn.uniqueName,
        `expect uniqueName of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(postgresqlColumn.uniqueName);
      expect(
        sqliteColumn.primary,
        `expect primary of column ${columnName} in table ${tableName} to be the same for both schemas`,
      ).toEqual(postgresqlColumn.primary);
    });

    const sqliteForeignKeys = sqliteTable[Symbol.for("drizzle:SQLiteInlineForeignKeys") as keyof typeof sqliteTable] as
      | SqliteForeignKey[]
      | undefined;
    const postgresqlForeignKeys = postgresqlTable[
      Symbol.for("drizzle:PgInlineForeignKeys") as keyof typeof postgresqlTable
    ] as PostgresqlForeignKey[] | undefined;
    if (!sqliteForeignKeys && !postgresqlForeignKeys) return;

    expect(postgresqlForeignKeys, `postgresql foreign key for ${tableName} to be defined`).toBeDefined();
    expect(sqliteForeignKeys, `sqlite foreign key for ${tableName} to be defined`).toBeDefined();

    expect(
      sqliteForeignKeys!.length,
      `expect number of foreign keys in table ${tableName} to be the same for both schemas`,
    ).toEqual(postgresqlForeignKeys?.length);

    sqliteForeignKeys?.forEach((sqliteForeignKey) => {
      sqliteForeignKey.getName();
      const postgresqlForeignKey = postgresqlForeignKeys!.find((key) => key.getName() === sqliteForeignKey.getName());
      expect(
        postgresqlForeignKey,
        `expect foreign key ${sqliteForeignKey.getName()} to be defined in postgresql schema`,
      ).toBeDefined();

      // In PostgreSql, onDelete is "no action" by default, so it is treated as undefined to match Sqlite.
      expect(
        sqliteForeignKey.onDelete,
        `expect foreign key (${sqliteForeignKey.getName()}) onDelete to be the same for both schemas`,
      ).toEqual(postgresqlForeignKey!.onDelete === "no action" ? undefined : postgresqlForeignKey!.onDelete);

      // In PostgreSql, onUpdate is "no action" by default, so it is treated as undefined to match Sqlite.
      expect(
        sqliteForeignKey.onUpdate,
        `expect foreign key (${sqliteForeignKey.getName()}) onUpdate to be the same for both schemas`,
      ).toEqual(postgresqlForeignKey!.onUpdate === "no action" ? undefined : postgresqlForeignKey!.onUpdate);

      sqliteForeignKey.reference().foreignColumns.forEach((column) => {
        expect(
          postgresqlForeignKey!.reference().foreignColumns.map((column) => column.name),
          `expect foreign key (${sqliteForeignKey.getName()}) columns to be the same for both schemas`,
        ).toContainEqual(column.name);
      });

      expect(
        Object.keys(sqliteForeignKey.reference().foreignTable),
        `expect foreign key (${sqliteForeignKey.getName()}) table to be the same for both schemas`,
      ).toEqual(Object.keys(postgresqlForeignKey!.reference().foreignTable).filter((key) => key !== "enableRLS"));
    });
  });
});

type SqliteTables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof sqliteSchema]: (typeof sqliteSchema)[K] extends SQLiteTableWithColumns<any>
    ? InferSelectModel<(typeof sqliteSchema)[K]>
    : never;
};
type MysqlTables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof mysqlSchema]: (typeof mysqlSchema)[K] extends MySqlTableWithColumns<any>
    ? InferSelectModel<(typeof mysqlSchema)[K]>
    : never;
};

type PostgresqlTables = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof postgresqlSchema]: (typeof postgresqlSchema)[K] extends PgTableWithColumns<any>
    ? InferSelectModel<(typeof postgresqlSchema)[K]>
    : never;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferColumnConfig<T extends Column<any, object>> =
  T extends Column<infer C, object> ? Omit<C, "columnType" | "enumValues" | "driverParam"> : never;

type SqliteConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof sqliteSchema]: (typeof sqliteSchema)[K] extends SQLiteTableWithColumns<any>
    ? {
        [C in keyof (typeof sqliteSchema)[K]["_"]["config"]["columns"]]: InferColumnConfig<
          (typeof sqliteSchema)[K]["_"]["config"]["columns"][C]
        >;
      }
    : never;
};

type MysqlConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof mysqlSchema]: (typeof mysqlSchema)[K] extends MySqlTableWithColumns<any>
    ? {
        [C in keyof (typeof mysqlSchema)[K]["_"]["config"]["columns"]]: InferColumnConfig<
          (typeof mysqlSchema)[K]["_"]["config"]["columns"][C]
        >;
      }
    : never;
};

type PostgreisqlConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof typeof postgresqlSchema]: (typeof postgresqlSchema)[K] extends PgTableWithColumns<any>
    ? {
        [C in keyof (typeof postgresqlSchema)[K]["_"]["config"]["columns"]]: InferColumnConfig<
          (typeof postgresqlSchema)[K]["_"]["config"]["columns"][C]
        >;
      }
    : never;
};
