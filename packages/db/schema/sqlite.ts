import type { AdapterAccount } from "@auth/core/adapters";
import type { DayOfWeek } from "@mantine/dates";
import { relations, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { blob, index, int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";
import type {
  BackgroundImageAttachment,
  BackgroundImageRepeat,
  BackgroundImageSize,
  BoardPermission,
  ColorScheme,
  GroupPermissionKey,
  IntegrationKind,
  IntegrationPermission,
  IntegrationSecretKind,
  OnboardingStep,
  SearchEngineType,
  SectionKind,
  SupportedAuthProvider,
  WidgetKind,
} from "@homarr/definitions";

export const apiKeys = sqliteTable("apiKey", {
  id: text().notNull().primaryKey(),
  apiKey: text().notNull(),
  salt: text().notNull(),
  userId: text()
    .notNull()
    .references((): AnySQLiteColumn => users.id, {
      onDelete: "cascade",
    }),
});

export const users = sqliteTable("user", {
  id: text().notNull().primaryKey(),
  name: text(),
  email: text(),
  emailVerified: int({ mode: "timestamp_ms" }),
  image: text(),
  password: text(),
  salt: text(),
  provider: text().$type<SupportedAuthProvider>().default("credentials").notNull(),
  homeBoardId: text().references((): AnySQLiteColumn => boards.id, {
    onDelete: "set null",
  }),
  mobileHomeBoardId: text().references((): AnySQLiteColumn => boards.id, {
    onDelete: "set null",
  }),
  defaultSearchEngineId: text().references(() => searchEngines.id, {
    onDelete: "set null",
  }),
  colorScheme: text().$type<ColorScheme>().default("dark").notNull(),
  firstDayOfWeek: int().$type<DayOfWeek>().default(1).notNull(), // Defaults to Monday
  pingIconsEnabled: int({ mode: "boolean" }).default(false).notNull(),
});

export const accounts = sqliteTable(
  "account",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().$type<AdapterAccount["type"]>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: int(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
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
    sessionToken: text().notNull().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: int({ mode: "timestamp_ms" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("user_id_idx").on(session.userId),
  }),
);

export const verificationTokens = sqliteTable(
  "verificationToken",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: int({ mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const groupMembers = sqliteTable(
  "groupMember",
  {
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (groupMember) => ({
    compoundKey: primaryKey({
      columns: [groupMember.groupId, groupMember.userId],
    }),
  }),
);

export const groups = sqliteTable("group", {
  id: text().notNull().primaryKey(),
  name: text().unique().notNull(),
  ownerId: text().references(() => users.id, {
    onDelete: "set null",
  }),
});

export const groupPermissions = sqliteTable("groupPermission", {
  groupId: text()
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  permission: text().$type<GroupPermissionKey>().notNull(),
});

export const invites = sqliteTable("invite", {
  id: text().notNull().primaryKey(),
  token: text().notNull().unique(),
  expirationDate: int({
    mode: "timestamp",
  }).notNull(),
  creatorId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const medias = sqliteTable("media", {
  id: text().notNull().primaryKey(),
  name: text().notNull(),
  content: blob({ mode: "buffer" }).$type<Buffer>().notNull(),
  contentType: text().notNull(),
  size: int().notNull(),
  createdAt: int({ mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  creatorId: text().references(() => users.id, { onDelete: "set null" }),
});

export const integrations = sqliteTable(
  "integration",
  {
    id: text().notNull().primaryKey(),
    name: text().notNull(),
    url: text().notNull(),
    kind: text().$type<IntegrationKind>().notNull(),
  },
  (integrations) => ({
    kindIdx: index("integration__kind_idx").on(integrations.kind),
  }),
);

export const integrationSecrets = sqliteTable(
  "integrationSecret",
  {
    kind: text().$type<IntegrationSecretKind>().notNull(),
    value: text().$type<`${string}.${string}`>().notNull(),
    updatedAt: int({ mode: "timestamp" })
      .$onUpdateFn(() => new Date())
      .notNull(),
    integrationId: text()
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (integrationSecret) => ({
    compoundKey: primaryKey({
      columns: [integrationSecret.integrationId, integrationSecret.kind],
    }),
    kindIdx: index("integration_secret__kind_idx").on(integrationSecret.kind),
    updatedAtIdx: index("integration_secret__updated_at_idx").on(integrationSecret.updatedAt),
  }),
);

export const integrationUserPermissions = sqliteTable(
  "integrationUserPermission",
  {
    integrationId: text()
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text().$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.userId, table.permission],
    }),
  }),
);

export const integrationGroupPermissions = sqliteTable(
  "integrationGroupPermissions",
  {
    integrationId: text()
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: text().$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.groupId, table.permission],
    }),
  }),
);

export const boards = sqliteTable("board", {
  id: text().notNull().primaryKey(),
  name: text().unique().notNull(),
  isPublic: int({ mode: "boolean" }).default(false).notNull(),
  creatorId: text().references(() => users.id, {
    onDelete: "set null",
  }),
  pageTitle: text(),
  metaTitle: text(),
  logoImageUrl: text(),
  faviconImageUrl: text(),
  backgroundImageUrl: text(),
  backgroundImageAttachment: text()
    .$type<BackgroundImageAttachment>()
    .default(backgroundImageAttachments.defaultValue)
    .notNull(),
  backgroundImageRepeat: text().$type<BackgroundImageRepeat>().default(backgroundImageRepeats.defaultValue).notNull(),
  backgroundImageSize: text().$type<BackgroundImageSize>().default(backgroundImageSizes.defaultValue).notNull(),
  primaryColor: text().default("#fa5252").notNull(),
  secondaryColor: text().default("#fd7e14").notNull(),
  opacity: int().default(100).notNull(),
  customCss: text(),
  columnCount: int().default(10).notNull(),
});

export const boardUserPermissions = sqliteTable(
  "boardUserPermission",
  {
    boardId: text()
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text().$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.userId, table.permission],
    }),
  }),
);

export const boardGroupPermissions = sqliteTable(
  "boardGroupPermission",
  {
    boardId: text()
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: text().$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.groupId, table.permission],
    }),
  }),
);

export const sections = sqliteTable("section", {
  id: text().notNull().primaryKey(),
  boardId: text()
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  kind: text().$type<SectionKind>().notNull(),
  xOffset: int().notNull(),
  yOffset: int().notNull(),
  width: int(),
  height: int(),
  name: text(),
  parentSectionId: text().references((): AnySQLiteColumn => sections.id, {
    onDelete: "cascade",
  }),
});

export const sectionCollapseStates = sqliteTable(
  "section_collapse_state",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sectionId: text()
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    collapsed: int({ mode: "boolean" }).default(false).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.userId, table.sectionId],
    }),
  }),
);

export const items = sqliteTable("item", {
  id: text().notNull().primaryKey(),
  sectionId: text()
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  kind: text().$type<WidgetKind>().notNull(),
  xOffset: int().notNull(),
  yOffset: int().notNull(),
  width: int().notNull(),
  height: int().notNull(),
  options: text().default('{"json": {}}').notNull(), // empty superjson object
  advancedOptions: text().default('{"json": {}}').notNull(), // empty superjson object
});

export const apps = sqliteTable("app", {
  id: text().notNull().primaryKey(),
  name: text().notNull(),
  description: text(),
  iconUrl: text().notNull(),
  href: text(),
});

export const integrationItems = sqliteTable(
  "integration_item",
  {
    itemId: text()
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    integrationId: text()
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.itemId, table.integrationId],
    }),
  }),
);

export const icons = sqliteTable("icon", {
  id: text().notNull().primaryKey(),
  name: text().notNull(),
  url: text().notNull(),
  checksum: text().notNull(),
  iconRepositoryId: text()
    .notNull()
    .references(() => iconRepositories.id, { onDelete: "cascade" }),
});

export const iconRepositories = sqliteTable("iconRepository", {
  id: text().notNull().primaryKey(),
  slug: text().notNull(),
});

export const serverSettings = sqliteTable("serverSetting", {
  settingKey: text().notNull().unique().primaryKey(),
  value: text().default('{"json": {}}').notNull(), // empty superjson object
});

export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const searchEngines = sqliteTable("search_engine", {
  id: text().notNull().primaryKey(),
  iconUrl: text().notNull(),
  name: text().notNull(),
  short: text().unique().notNull(),
  description: text(),
  urlTemplate: text(),
  type: text().$type<SearchEngineType>().notNull().default("generic"),
  integrationId: text().references(() => integrations.id, { onDelete: "cascade" }),
});

export const onboarding = sqliteTable("onboarding", {
  id: text().notNull().primaryKey(),
  step: text().$type<OnboardingStep>().notNull(),
  previousStep: text().$type<OnboardingStep>(),
});

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  accounts: many(accounts),
  boards: many(boards),
  boardPermissions: many(boardUserPermissions),
  groups: many(groupMembers),
  ownedGroups: many(groups),
  invites: many(invites),
  medias: many(medias),
  defaultSearchEngine: one(searchEngines, {
    fields: [users.defaultSearchEngineId],
    references: [searchEngines.id],
  }),
}));

export const mediaRelations = relations(medias, ({ one }) => ({
  creator: one(users, {
    fields: [medias.creatorId],
    references: [users.id],
  }),
}));

export const iconRelations = relations(icons, ({ one }) => ({
  repository: one(iconRepositories, {
    fields: [icons.iconRepositoryId],
    references: [iconRepositories.id],
  }),
}));

export const iconRepositoryRelations = relations(iconRepositories, ({ many }) => ({
  icons: many(icons),
}));

export const inviteRelations = relations(invites, ({ one }) => ({
  creator: one(users, {
    fields: [invites.creatorId],
    references: [users.id],
  }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const groupMemberRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const groupRelations = relations(groups, ({ one, many }) => ({
  permissions: many(groupPermissions),
  boardPermissions: many(boardGroupPermissions),
  members: many(groupMembers),
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
}));

export const groupPermissionRelations = relations(groupPermissions, ({ one }) => ({
  group: one(groups, {
    fields: [groupPermissions.groupId],
    references: [groups.id],
  }),
}));

export const boardUserPermissionRelations = relations(boardUserPermissions, ({ one }) => ({
  user: one(users, {
    fields: [boardUserPermissions.userId],
    references: [users.id],
  }),
  board: one(boards, {
    fields: [boardUserPermissions.boardId],
    references: [boards.id],
  }),
}));

export const boardGroupPermissionRelations = relations(boardGroupPermissions, ({ one }) => ({
  group: one(groups, {
    fields: [boardGroupPermissions.groupId],
    references: [groups.id],
  }),
  board: one(boards, {
    fields: [boardGroupPermissions.boardId],
    references: [boards.id],
  }),
}));

export const integrationRelations = relations(integrations, ({ many }) => ({
  secrets: many(integrationSecrets),
  items: many(integrationItems),
  userPermissions: many(integrationUserPermissions),
  groupPermissions: many(integrationGroupPermissions),
}));

export const integrationUserPermissionRelations = relations(integrationUserPermissions, ({ one }) => ({
  user: one(users, {
    fields: [integrationUserPermissions.userId],
    references: [users.id],
  }),
  integration: one(integrations, {
    fields: [integrationUserPermissions.integrationId],
    references: [integrations.id],
  }),
}));

export const integrationGroupPermissionRelations = relations(integrationGroupPermissions, ({ one }) => ({
  group: one(groups, {
    fields: [integrationGroupPermissions.groupId],
    references: [groups.id],
  }),
  integration: one(integrations, {
    fields: [integrationGroupPermissions.integrationId],
    references: [integrations.id],
  }),
}));

export const integrationSecretRelations = relations(integrationSecrets, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationSecrets.integrationId],
    references: [integrations.id],
  }),
}));

export const boardRelations = relations(boards, ({ many, one }) => ({
  sections: many(sections),
  creator: one(users, {
    fields: [boards.creatorId],
    references: [users.id],
  }),
  userPermissions: many(boardUserPermissions),
  groupPermissions: many(boardGroupPermissions),
}));

export const sectionRelations = relations(sections, ({ many, one }) => ({
  items: many(items),
  board: one(boards, {
    fields: [sections.boardId],
    references: [boards.id],
  }),
  collapseStates: many(sectionCollapseStates),
}));

export const sectionCollapseStateRelations = relations(sectionCollapseStates, ({ one }) => ({
  user: one(users, {
    fields: [sectionCollapseStates.userId],
    references: [users.id],
  }),
  section: one(sections, {
    fields: [sectionCollapseStates.sectionId],
    references: [sections.id],
  }),
}));

export const itemRelations = relations(items, ({ one, many }) => ({
  section: one(sections, {
    fields: [items.sectionId],
    references: [sections.id],
  }),
  integrations: many(integrationItems),
}));

export const integrationItemRelations = relations(integrationItems, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationItems.integrationId],
    references: [integrations.id],
  }),
  item: one(items, {
    fields: [integrationItems.itemId],
    references: [items.id],
  }),
}));

export const searchEngineRelations = relations(searchEngines, ({ one, many }) => ({
  integration: one(integrations, {
    fields: [searchEngines.integrationId],
    references: [integrations.id],
  }),
  usersWithDefault: many(users),
}));
