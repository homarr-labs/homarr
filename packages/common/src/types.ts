export type MaybePromise<T> = T | Promise<T>;

export type AtLeastOneOf<T> = [T, ...T[]];

export type Modify<T, R extends Partial<Record<keyof T, unknown>>> = {
  [P in keyof (Omit<T, keyof R> & R)]: (Omit<T, keyof R> & R)[P];
};

export type RemoveReadonly<T> = {
  -readonly [P in keyof T]: T[P] extends Record<string, unknown> ? RemoveReadonly<T[P]> : T[P];
};

export type MaybeArray<T> = T | T[];
