import type { InferInsertModel } from "drizzle-orm";

import { objectEntries } from "@homarr/common";

import type { HomarrDatabase, HomarrDatabaseMysql, HomarrDatabasePostgresql, typeOfHomarrDatabase } from "./driver";
import { env } from "./env";
import * as schema from "./schema";
import type * as mysqlSchema from "./schema/mysql";
import type * as postgresqlSchema from "./schema/postgresql";

type TableKey = {
  [K in keyof typeof schema]: (typeof schema)[K] extends { _: { brand: "Table" } } ? K : never;
}[keyof typeof schema];

export function isMysql(): boolean {
  return env.DB_DRIVER === "mysql2";
}

export function isPostgresql(): boolean {
  return env.DB_DRIVER === "postgresql";
}

export const createDbInsertCollectionForTransaction = <TTableKey extends TableKey>(
  tablesInInsertOrder: TTableKey[],
) => {
  const context = tablesInInsertOrder.reduce(
    (acc, key) => {
      acc[key] = [];
      return acc;
    },
    {} as { [K in TTableKey]: InferInsertModel<(typeof schema)[K]>[] },
  );
  async function insertAllMysqlAsync(db: HomarrDatabaseMysql) {
    await db.transaction(async (transaction) => {
      for (const [key, values] of objectEntries(context)) {
        if (values.length >= 1) {
          // Below is actually the mysqlSchema when the driver is mysql
          const schemaMySql = schema as unknown as typeof mysqlSchema;
          await transaction.insert(schemaMySql[key]).values(values as never);
        }
      }
    });
  }
  async function insertAllPostgresqlAsync(db: HomarrDatabasePostgresql) {
    await db.transaction(async (transaction) => {
      for (const [key, values] of objectEntries(context)) {
        if (values.length >= 1) {
          // Below is actually the mysqlSchema when the driver is mysql
          const schemaPostgreSql = schema as unknown as typeof postgresqlSchema;
          await transaction.insert(schemaPostgreSql[key]).values(values as never);
        }
      }
    });
  }

  return {
    ...context,
    insertAll: (db: typeOfHomarrDatabase) => {
      (db as HomarrDatabase).transaction((transaction) => {
        for (const [key, values] of objectEntries(context)) {
          if (values.length >= 1) {
            transaction
              .insert(schema[key])
              .values(values as never)
              .run();
          }
        }
      });
    },
    insertAllAsync: async (db: typeOfHomarrDatabase) => {
      if (isMysql()) {
        await insertAllMysqlAsync(db as unknown as HomarrDatabaseMysql);
      } else if (isPostgresql()) {
        await insertAllPostgresqlAsync(db as unknown as HomarrDatabasePostgresql);
      } else {
        throw new Error(`Unsupported DB_DRIVER: ${env.DB_DRIVER}`);
      }
    },
  };
};

export const createDbInsertCollectionWithoutTransaction = <TTableKey extends TableKey>(
  tablesInInsertOrder: TTableKey[],
) => {
  const { insertAll, insertAllAsync, ...collection } = createDbInsertCollectionForTransaction(tablesInInsertOrder);

  return {
    ...collection,
    insertAllAsync: async (db: typeOfHomarrDatabase) => {
      switch (env.DB_DRIVER) {
        case "mysql2":
        case "postgresql":
          // For mysql2 and postgresql, we can use the async insertAllAsync method
          await insertAllAsync(db);
          return;
        default:
          // For better-sqlite3, we need to use the synchronous insertAll method
          // default assumes better-sqlite3. It's original implementation.
          insertAll(db);
          break;
      }
    },
  };
};
