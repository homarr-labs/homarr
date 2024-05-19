export function objectKeys<O extends object>(obj: O): (keyof O)[] {
  return Object.keys(obj) as (keyof O)[];
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const objectEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>;
