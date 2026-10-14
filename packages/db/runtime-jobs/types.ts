import type { PersistenceRuntime } from "../runtime";

export type RuntimeJobSqlValue = string | number | boolean | null;

export interface RuntimeJobSqlStatement {
  sql: string;
  parameters: readonly RuntimeJobSqlValue[];
}

export interface RuntimeJobsSqlPort {
  readonly dialect: "sqlite" | "postgresql";
  queryAsync(statement: RuntimeJobSqlStatement): Promise<readonly Record<string, unknown>[]>;
  executeTransactionAsync(statements: readonly RuntimeJobSqlStatement[]): Promise<readonly { affectedRows: number }[]>;
  querySnapshotAsync(
    statements: readonly RuntimeJobSqlStatement[],
  ): Promise<readonly (readonly Record<string, unknown>[])[]>;
}

export interface RuntimeJobsSqlLimits {
  operationTimeoutMs: number;
  maxPendingOperations: number;
  maxStatements: number;
  maxStatementBytes: number;
  maxBatchBytes: number;
  maxParametersPerStatement: number;
  maxResultRows: number;
  maxResultBytes: number;
}

export interface RuntimeJobsSqlOptions {
  runtime: PersistenceRuntime;
  epoch: string;
  lifetime: AbortSignal;
  limits: RuntimeJobsSqlLimits;
}
