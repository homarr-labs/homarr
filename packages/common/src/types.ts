export type MaybePromise<T> = T | Promise<T>;

export type AtLeastOneOf<T> = [T, ...T[]];

export type Modify<T, R extends Partial<Record<keyof T, unknown>>> = {
  [P in keyof (Omit<T, keyof R> & R)]: (Omit<T, keyof R> & R)[P];
};
