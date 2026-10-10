import type { DrizzleConfig, Logger } from "drizzle-orm";

export type SharedDrizzleConfig<TSchema extends Record<string, unknown>> = Required<
  Pick<DrizzleConfig<TSchema>, "logger" | "casing" | "schema">
>;

export class WinstonDrizzleLogger implements Logger {
  constructor(private readonly debug: (query: string) => void) {}

  logQuery(query: string, _: unknown[]): void {
    this.debug(query);
  }
}
