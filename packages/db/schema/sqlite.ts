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

import type { IntegrationSecretSort, IntegrationSort } from "./items";

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

export const availabilityUrls = sqliteTable(
  "availabilityUrl",
  {
    id: text("id").notNull().primaryKey(),
    url: text("url").notNull(),
    isStatusCheckEnabled: integer("is_status_check_enabled", {
      mode: "boolean",
    }).notNull(),
  },
  (au) => ({
    urlIdx: index("availibility_url__url_idx").on(au.url),
  }),
);

export const statusChecks = sqliteTable(
  "statusCheck",
  {
    id: text("id").notNull().primaryKey(),
    statusCode: integer("status_code").notNull(),
    isSuccess: integer("is_success", { mode: "boolean" }).notNull(),
    timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
    availabilityUrlId: text("availability_url_id")
      .notNull()
      .references(() => availabilityUrls.id),
  },
  (sc) => ({
    timeStampIdx: index("status_check__timestamp_idx").on(sc.timestamp),
    statusCodeIdx: index("status_check__status_code_idx").on(sc.statusCode),
  }),
);

export const services = sqliteTable("service", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  availabilityUrlId: text("availability_url_id")
    .notNull()
    .references(() => availabilityUrls.id),
});

export const integrations = sqliteTable(
  "integration",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    sort: text("sort").$type<IntegrationSort>().notNull(),
    serviceId: text("service_id")
      .notNull()
      .references(() => services.id),
  },
  (i) => ({
    sortIdx: index("integration__sort_idx").on(i.sort),
  }),
);

export const integrationSecrets = sqliteTable(
  "integrationSecret",
  {
    id: text("id").notNull().primaryKey(),
    sort: text("sort").$type<IntegrationSecretSort>().notNull(),
    value: text("value").notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (is) => ({
    sortIdx: index("integration_secret__sort_idx").on(is.sort),
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

export const availabilityUrlRelations = relations(
  availabilityUrls,
  ({ many }) => ({
    statusChecks: many(statusChecks),
    services: many(services),
  }),
);

export const statusCheckRelations = relations(statusChecks, ({ one }) => ({
  availabilityUrl: one(availabilityUrls, {
    fields: [statusChecks.availabilityUrlId],
    references: [availabilityUrls.id],
  }),
}));

export const serviceRelations = relations(services, ({ one, many }) => ({
  availabilityUrl: one(availabilityUrls, {
    fields: [services.availabilityUrlId],
    references: [availabilityUrls.id],
  }),
  integrations: many(integrations),
}));

export const integrationRelations = relations(
  integrations,
  ({ one, many }) => ({
    service: one(services, {
      fields: [integrations.serviceId],
      references: [services.id],
    }),
    secrets: many(integrationSecrets),
  }),
);

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
export type AvailabilityUrl = InferSelectModel<typeof availabilityUrls>;
export type StatusCheck = InferSelectModel<typeof statusChecks>;
export type Service = InferSelectModel<typeof services>;
export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationSecret = InferSelectModel<typeof integrationSecrets>;
