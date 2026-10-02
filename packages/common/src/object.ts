import { hashKey } from "@tanstack/query-core";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function objectKeys<O extends object>(obj: O): (keyof O)[] {
  return Object.keys(obj) as (keyof O)[];
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const objectEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>;

export const hashObjectBase64 = (obj: object) => {
  return Buffer.from(hashKey([obj])).toString("base64");
};
