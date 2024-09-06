export type MaybePromise<T> = T | Promise<T>;

export type AtLeastOneOf<T> = [T, ...T[]];
