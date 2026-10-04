import type { Connection, ConnectionOptions } from "mysql2/promise";

export const fixtureUser: string;
export const fixturePassword: string;
export const fixtureBoard: string;
export const fixtureSecret: string;
export const fixtureMedia: Buffer;
export const fixtureDate: string;
export const fixturePasswordHash: string;
export const fixtureCiphertext: string;
export function createFixture(): Promise<{
  connectionOptions: ConnectionOptions;
  connection: Connection;
  container: string;
  cleanup(): Promise<void>;
}>;
