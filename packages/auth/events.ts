import { cookies } from "next/headers";

import type { Database } from "@homarr/db";

import { createSignInEventHandler as createCoreSignInEventHandler } from "./events-core";

export const createSignInEventHandler = (db: Database) =>
  createCoreSignInEventHandler(db, async (name, value, options) => {
    (await cookies()).set(name, value, options);
  });
