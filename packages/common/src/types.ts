export type MaybePromise<T> = T | Promise<T>;

// @Meierschlumpf
export type IsUnion<T, U extends T = T> =
    (T extends unknown ?
    (U extends T ? false : true)
        : never) extends false ? false : true;

export type UnionArrayWithAtLeastOneElement<T> = IsUnion<T> extends true ? [T, ...T[]] : [T];