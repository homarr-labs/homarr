import type { InferSelectModel } from "drizzle-orm";

import * as mysqlSchema from "./mysql";
import * as sqliteSchema from "./sqlite";

type Schema = typeof sqliteSchema;

const schema = process.env.DB_DRIVER === "mysql2" ? (mysqlSchema as unknown as Schema) : sqliteSchema;

// Sadly we can't use export * from here as we have multiple possible exports
export const {
  accounts,
  apiKeys,
  apps,
  boardGroupPermissions,
  boardUserPermissions,
  boards,
  groupMembers,
  groupPermissions,
  groups,
  iconRepositories,
  icons,
  integrationGroupPermissions,
  integrationItems,
  integrationSecrets,
  integrationUserPermissions,
  integrations,
  invites,
  items,
  medias,
  onboarding,
  searchEngines,
  sections,
  serverSettings,
  sessions,
  users,
  verificationTokens,
  sectionCollapseStates,
  layouts,
  itemLayouts,
  sectionLayouts,
} = schema;

export type User = InferSelectModel<typeof schema.users>;
export type Account = InferSelectModel<typeof schema.accounts>;
export type Session = InferSelectModel<typeof schema.sessions>;
export type VerificationToken = InferSelectModel<typeof schema.verificationTokens>;
export type Integration = InferSelectModel<typeof schema.integrations>;
export type IntegrationSecret = InferSelectModel<typeof schema.integrationSecrets>;
