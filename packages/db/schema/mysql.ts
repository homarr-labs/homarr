import type { AdapterAccount } from "@auth/core/adapters";
import type { DayOfWeek } from "@mantine/dates";
import { relations } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import {
  boolean,
  customType,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

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
  SearchEngineType,
  SectionKind,
  SupportedAuthProvider,
  WidgetKind,
} from "@homarr/definitions";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";

const customBlob = customType<{ data: Buffer }>({
  dataType() {
    return "BLOB";
  },
});

export const apiKeys = mysqlTable("apiKey", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  apiKey: text().notNull(),
  salt: text().notNull(),
  userId: varchar({ length: 64 })
    .notNull()
    .references((): AnyMySqlColumn => users.id, {
      onDelete: "cascade",
    }),
});

export const users = mysqlTable("user", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: text(),
  email: text(),
  emailVerified: timestamp(),
  image: text(),
  password: text(),
  salt: text(),
  provider: varchar({ length: 64 }).$type<SupportedAuthProvider>().default("credentials").notNull(),
  homeBoardId: varchar({ length: 64 }).references((): AnyMySqlColumn => boards.id, {
    onDelete: "set null",
  }),
  colorScheme: varchar({ length: 5 }).$type<ColorScheme>().default("dark").notNull(),
  firstDayOfWeek: tinyint().$type<DayOfWeek>().default(1).notNull(), // Defaults to Monday
  pingIconsEnabled: boolean().default(false).notNull(),
});

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar({ length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().$type<AdapterAccount["type"]>().notNull(),
    provider: varchar({ length: 64 }).notNull(),
    providerAccountId: varchar({ length: 64 }).notNull(),
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

export const sessions = mysqlTable(
  "session",
  {
    sessionToken: varchar({ length: 512 }).notNull().primaryKey(),
    userId: varchar({ length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp().notNull(),
  },
  (session) => ({
    userIdIdx: index("user_id_idx").on(session.userId),
  }),
);

export const verificationTokens = mysqlTable(
  "verificationToken",
  {
    identifier: varchar({ length: 64 }).notNull(),
    token: varchar({ length: 512 }).notNull(),
    expires: timestamp().notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const groupMembers = mysqlTable(
  "groupMember",
  {
    groupId: varchar({ length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: varchar({ length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (groupMember) => ({
    compoundKey: primaryKey({
      columns: [groupMember.groupId, groupMember.userId],
    }),
  }),
);

export const groups = mysqlTable("group", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 64 }).unique().notNull(),
  ownerId: varchar({ length: 64 }).references(() => users.id, {
    onDelete: "set null",
  }),
});

export const groupPermissions = mysqlTable("groupPermission", {
  groupId: varchar({ length: 64 })
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  permission: text().$type<GroupPermissionKey>().notNull(),
});

export const invites = mysqlTable("invite", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  token: varchar({ length: 512 }).notNull().unique(),
  expirationDate: timestamp().notNull(),
  creatorId: varchar({ length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const medias = mysqlTable("media", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 512 }).notNull(),
  content: customBlob().notNull(),
  contentType: text().notNull(),
  size: int().notNull(),
  createdAt: timestamp({ mode: "date" }).notNull().defaultNow(),
  creatorId: varchar({ length: 64 }).references(() => users.id, { onDelete: "set null" }),
});

export const integrations = mysqlTable(
  "integration",
  {
    id: varchar({ length: 64 }).notNull().primaryKey(),
    name: text().notNull(),
    url: text().notNull(),
    kind: varchar({ length: 128 }).$type<IntegrationKind>().notNull(),
  },
  (integrations) => ({
    kindIdx: index("integration__kind_idx").on(integrations.kind),
  }),
);

export const integrationSecrets = mysqlTable(
  "integrationSecret",
  {
    kind: varchar({ length: 16 }).$type<IntegrationSecretKind>().notNull(),
    value: text().$type<`${string}.${string}`>().notNull(),
    updatedAt: timestamp()
      .$onUpdateFn(() => new Date())
      .notNull(),
    integrationId: varchar({ length: 64 })
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

export const integrationUserPermissions = mysqlTable(
  "integrationUserPermission",
  {
    integrationId: varchar({ length: 64 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    userId: varchar({ length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: varchar({ length: 128 }).$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.userId, table.permission],
    }),
  }),
);

export const integrationGroupPermissions = mysqlTable(
  "integrationGroupPermissions",
  {
    integrationId: varchar({ length: 64 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    groupId: varchar({ length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: varchar({ length: 128 }).$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.groupId, table.permission],
      name: "integration_group_permission__pk",
    }),
  }),
);

export const boards = mysqlTable("board", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 256 }).unique().notNull(),
  isPublic: boolean().default(false).notNull(),
  creatorId: varchar({ length: 64 }).references(() => users.id, {
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

export const boardUserPermissions = mysqlTable(
  "boardUserPermission",
  {
    boardId: varchar({ length: 64 })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: varchar({ length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: varchar({ length: 128 }).$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.userId, table.permission],
    }),
  }),
);

export const boardGroupPermissions = mysqlTable(
  "boardGroupPermission",
  {
    boardId: varchar({ length: 64 })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    groupId: varchar({ length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: varchar({ length: 128 }).$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.groupId, table.permission],
    }),
  }),
);

export const sections = mysqlTable("section", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  boardId: varchar({ length: 64 })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  kind: text().$type<SectionKind>().notNull(),
  xOffset: int().notNull(),
  yOffset: int().notNull(),
  width: int(),
  height: int(),
  name: text(),
  parentSectionId: varchar({ length: 64 }).references((): AnyMySqlColumn => sections.id, {
    onDelete: "cascade",
  }),
});

export const items = mysqlTable("item", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  sectionId: varchar({ length: 64 })
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

export const apps = mysqlTable("app", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: text().notNull(),
  description: text(),
  iconUrl: text().notNull(),
  href: text(),
});

export const integrationItems = mysqlTable(
  "integration_item",
  {
    itemId: varchar({ length: 64 })
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    integrationId: varchar({ length: 64 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.itemId, table.integrationId],
    }),
  }),
);

export const icons = mysqlTable("icon", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  name: varchar({ length: 250 }).notNull(),
  url: text().notNull(),
  checksum: text().notNull(),
  iconRepositoryId: varchar({ length: 64 })
    .notNull()
    .references(() => iconRepositories.id, { onDelete: "cascade" }),
});

export const iconRepositories = mysqlTable("iconRepository", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  slug: varchar({ length: 150 }).notNull(),
});

export const serverSettings = mysqlTable("serverSetting", {
  settingKey: varchar({ length: 64 }).notNull().unique().primaryKey(),
  value: text().default('{"json": {}}').notNull(), // empty superjson object
});

export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const searchEngines = mysqlTable("search_engine", {
  id: varchar({ length: 64 }).notNull().primaryKey(),
  iconUrl: text().notNull(),
  name: varchar({ length: 64 }).notNull(),
  short: varchar({ length: 8 }).notNull(),
  description: text(),
  urlTemplate: text(),
  type: varchar({ length: 64 }).$type<SearchEngineType>().notNull().default("generic"),
  integrationId: varchar({ length: 64 }).references(() => integrations.id, { onDelete: "cascade" }),
});

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  boards: many(boards),
  boardPermissions: many(boardUserPermissions),
  groups: many(groupMembers),
  ownedGroups: many(groups),
  invites: many(invites),
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

export const searchEngineRelations = relations(searchEngines, ({ one }) => ({
  integration: one(integrations, {
    fields: [searchEngines.integrationId],
    references: [integrations.id],
  }),
}));
