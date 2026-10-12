import type { SQL } from "drizzle-orm";
import { DrizzleError } from "drizzle-orm";

import type { HomarrDatabase } from "./driver";
import { handleDiffrentDbDriverOperationsAsync } from "./transactions";

export const executeWritePlanAsync = async (db: HomarrDatabase, plan: readonly SQL[]): Promise<void> => {
  const statements = [...plan];
  if (statements.length === 0) return;

  await handleDiffrentDbDriverOperationsAsync(db, {
    async handleAsync(connection) {
      await connection.transaction(async (transaction) => {
        for (const statement of statements) {
          await transaction.execute(statement);
        }
      });
    },
    handleSync(connection) {
      connection.transaction((transaction) => {
        for (const statement of statements) {
          try {
            transaction.run(statement);
          } catch (error) {
            if (error instanceof DrizzleError && error.cause !== undefined) throw error.cause;
            throw error;
          }
        }
      });
    },
  });
};
