import type { MaybePromise } from "@homarr/common/types";

export interface AuthCookieOptions {
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
}

export interface AuthCookieStore {
  get: (name: string) => MaybePromise<string | undefined>;
  set: (name: string, value: string, options: AuthCookieOptions) => MaybePromise<void>;
}
