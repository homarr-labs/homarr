// @ts-nocheck
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { Column, InferSelectModel } from "drizzle-orm";
import type { ForeignKey as MysqlForeignKey, MySqlTableWithColumns } from "drizzle-orm/mysql-core";
import type { ForeignKey as SqliteForeignKey, SQLiteTableWithColumns } from "drizzle-orm/sqlite-core";
import { expect, expectTypeOf, test } from "vitest";

import { objectEntries } from "@homarr/common";

import * as mysqlSchema from "../schema/mysql";
import * as sqliteSchema from "../schema/sqlite";

// We need the following two types as there is currently no support for Buffer in mysql and
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

      const mysqlTable = mysqlSchema[tableName];

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

    const mysqlTable = mysqlSchema[tableName];
    const sqliteForeignKeys = sqliteTable[Symbol.for("drizzle:SQLiteInlineForeignKeys") as keyof typeof sqliteTable] as
      | SqliteForeignKey[]
      | undefined;
    const mysqlForeignKeys = mysqlTable[Symbol.for("drizzle:MySqlInlineForeignKeys") as keyof typeof mysqlTable] as
      | MysqlForeignKey[]
      | undefined;

    if (!sqliteForeignKeys && !mysqlForeignKeys) return;

    expect(mysqlForeignKeys, `mysql foreign key for ${tableName} to be defined`).toBeDefined();
    expect(sqliteForeignKeys, `sqlite foreign key for ${tableName} to be defined`).toBeDefined();

    expect(
      sqliteForeignKeys!.length,
      `expect number of foreign keys in table ${tableName} to be the same for both schemas`,
    ).toEqual(mysqlForeignKeys!.length);

    sqliteForeignKeys?.forEach((sqliteForeignKey) => {
      sqliteForeignKey.getName();
      const mysqlForeignKey = mysqlForeignKeys!.find((key) => key.getName() === sqliteForeignKey.getName());
      expect(
        mysqlForeignKey,
        `expect foreign key ${sqliteForeignKey.getName()} to be defined in mysql schema`,
      ).toBeDefined();

      expect(
        sqliteForeignKey.onDelete,
        `expect foreign key (${sqliteForeignKey.getName()}) onDelete to be the same for both schemas`,
      ).toEqual(mysqlForeignKey!.onDelete);

      expect(
        sqliteForeignKey.onUpdate,
        `expect foreign key (${sqliteForeignKey.getName()}) onUpdate to be the same for both schemas`,
      ).toEqual(mysqlForeignKey!.onUpdate);

      sqliteForeignKey.reference().foreignColumns.forEach((column) => {
        expect(
          mysqlForeignKey!.reference().foreignColumns.map((column) => column.name),
          `expect foreign key (${sqliteForeignKey.getName()}) columns to be the same for both schemas`,
        ).toContainEqual(column.name);
      });

      expect(
        Object.keys(sqliteForeignKey.reference().foreignTable),
        `expect foreign key (${sqliteForeignKey.getName()}) table to be the same for both schemas`,
      ).toEqual(Object.keys(mysqlForeignKey!.reference().foreignTable));
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
