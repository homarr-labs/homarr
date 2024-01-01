import type { AdapterAccount } from "@auth/core/adapters";
import type { InferSelectModel } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import type {
  IntegrationKind,
  IntegrationSecretKind,
} from "@homarr/definitions";

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email"),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"),
  salt: text("salt"),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("userId_idx").on(account.userId),
  }),
);

export const sessions = sqliteTable(
  "session",
  {
    sessionToken: text("sessionToken").notNull().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("user_id_idx").on(session.userId),
  }),
);

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const integrations = sqliteTable(
  "integration",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    kind: text("kind").$type<IntegrationKind>().notNull(),
  },
  (i) => ({
    kindIdx: index("integration__kind_idx").on(i.kind),
  }),
);

export const integrationSecrets = sqliteTable(
  "integrationSecret",
  {
    kind: text("kind").$type<IntegrationSecretKind>().notNull(),
    value: text("value").$type<`${string}.${string}`>().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (is) => ({
    compoundKey: primaryKey({
      columns: [is.integrationId, is.kind],
    }),
    kindIdx: index("integration_secret__kind_idx").on(is.kind),
    updatedAtIdx: index("integration_secret__updated_at_idx").on(is.updatedAt),
  }),
);

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
}));

export const integrationRelations = relations(integrations, ({ many }) => ({
  secrets: many(integrationSecrets),
}));

export const integrationSecretRelations = relations(
  integrationSecrets,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [integrationSecrets.integrationId],
      references: [integrations.id],
    }),
  }),
);

export type User = InferSelectModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type Session = InferSelectModel<typeof sessions>;
export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationSecret = InferSelectModel<typeof integrationSecrets>;
