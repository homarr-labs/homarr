import { DrizzleAdapter } from "@auth/drizzle-adapter";

import { db } from "@homarr/db";

export const adapter = DrizzleAdapter(db);
