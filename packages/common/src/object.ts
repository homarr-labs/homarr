export function objectKeys<O extends object>(obj: O): (keyof O)[] {
  return Object.keys(obj) as (keyof O)[];
}

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];

export const objectEntries = <T extends object>(obj: T) => Object.entries(obj) as Entries<T>;

export const hashObjectBase64 = (obj: object) => {
  const json = JSON.stringify([obj], (_, val) =>
    typeof val === "object" && val !== null && !Array.isArray(val)
      ? Object.keys(val)
          .toSorted()
          .reduce(
            (acc, key) => {
              acc[key] = (val as Record<string, unknown>)[key];
              return acc;
            },
            {} as Record<string, unknown>,
          )
      : val,
  );
  return Buffer.from(json).toString("base64");
};
