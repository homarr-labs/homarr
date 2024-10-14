import type { AdapterAccount } from "@auth/core/adapters";
import type { DayOfWeek } from "@mantine/dates";
import { relations } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { boolean, index, int, mysqlTable, primaryKey, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

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
  SectionKind,
  SupportedAuthProvider,
  WidgetKind,
} from "@homarr/definitions";
import { backgroundImageAttachments, backgroundImageRepeats, backgroundImageSizes } from "@homarr/definitions";

export const apiKeys = mysqlTable("apiKey", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  apiKey: text("apiKey").notNull(),
  salt: text("salt").notNull(),
  userId: varchar("userId", { length: 64 })
    .notNull()
    .references((): AnyMySqlColumn => users.id, {
      onDelete: "cascade",
    }),
});

export const users = mysqlTable("user", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified"),
  image: text("image"),
  password: text("password"),
  salt: text("salt"),
  provider: varchar("provider", { length: 64 }).$type<SupportedAuthProvider>().default("credentials").notNull(),
  homeBoardId: varchar("homeBoardId", { length: 64 }).references((): AnyMySqlColumn => boards.id, {
    onDelete: "set null",
  }),
  colorScheme: varchar("colorScheme", { length: 5 }).$type<ColorScheme>().default("auto").notNull(),
  firstDayOfWeek: tinyint("firstDayOfWeek").$type<DayOfWeek>().default(1).notNull(), // Defaults to Monday
  pingIconsEnabled: boolean("pingIconsEnabled").default(false).notNull(),
});

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 64 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
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

export const sessions = mysqlTable(
  "session",
  {
    sessionToken: varchar("sessionToken", { length: 512 }).notNull().primaryKey(),
    userId: varchar("userId", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires").notNull(),
  },
  (session) => ({
    userIdIdx: index("user_id_idx").on(session.userId),
  }),
);

export const verificationTokens = mysqlTable(
  "verificationToken",
  {
    identifier: varchar("identifier", { length: 64 }).notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    expires: timestamp("expires").notNull(),
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
    groupId: varchar("groupId", { length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: varchar("userId", { length: 64 })
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
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  name: varchar("name", { length: 64 }).notNull(),
  ownerId: varchar("owner_id", { length: 64 }).references(() => users.id, {
    onDelete: "set null",
  }),
});

export const groupPermissions = mysqlTable("groupPermission", {
  groupId: varchar("groupId", { length: 64 })
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  permission: text("permission").$type<GroupPermissionKey>().notNull(),
});

export const invites = mysqlTable("invite", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expirationDate: timestamp("expiration_date").notNull(),
  creatorId: varchar("creator_id", { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const integrations = mysqlTable(
  "integration",
  {
    id: varchar("id", { length: 64 }).notNull().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    kind: varchar("kind", { length: 128 }).$type<IntegrationKind>().notNull(),
  },
  (integrations) => ({
    kindIdx: index("integration__kind_idx").on(integrations.kind),
  }),
);

export const integrationSecrets = mysqlTable(
  "integrationSecret",
  {
    kind: varchar("kind", { length: 16 }).$type<IntegrationSecretKind>().notNull(),
    value: text("value").$type<`${string}.${string}`>().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdateFn(() => new Date())
      .notNull(),
    integrationId: varchar("integration_id", { length: 64 })
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
    integrationId: varchar("integration_id", { length: 64 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 128 }).$type<IntegrationPermission>().notNull(),
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
    integrationId: varchar("integration_id", { length: 64 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    groupId: varchar("group_id", { length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 128 }).$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.groupId, table.permission],
      name: "integration_group_permission__pk",
    }),
  }),
);

export const boards = mysqlTable("board", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  name: varchar("name", { length: 256 }).unique().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  creatorId: varchar("creator_id", { length: 64 }).references(() => users.id, {
    onDelete: "set null",
  }),
  pageTitle: text("page_title"),
  metaTitle: text("meta_title"),
  logoImageUrl: text("logo_image_url"),
  faviconImageUrl: text("favicon_image_url"),
  backgroundImageUrl: text("background_image_url"),
  backgroundImageAttachment: text("background_image_attachment")
    .$type<BackgroundImageAttachment>()
    .default(backgroundImageAttachments.defaultValue)
    .notNull(),
  backgroundImageRepeat: text("background_image_repeat")
    .$type<BackgroundImageRepeat>()
    .default(backgroundImageRepeats.defaultValue)
    .notNull(),
  backgroundImageSize: text("background_image_size")
    .$type<BackgroundImageSize>()
    .default(backgroundImageSizes.defaultValue)
    .notNull(),
  primaryColor: text("primary_color").default("#fa5252").notNull(),
  secondaryColor: text("secondary_color").default("#fd7e14").notNull(),
  opacity: int("opacity").default(100).notNull(),
  customCss: text("custom_css"),
  columnCount: int("column_count").default(10).notNull(),
});

export const boardUserPermissions = mysqlTable(
  "boardUserPermission",
  {
    boardId: varchar("board_id", { length: 64 })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 64 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 128 }).$type<BoardPermission>().notNull(),
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
    boardId: varchar("board_id", { length: 64 })
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    groupId: varchar("group_id", { length: 64 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: varchar("permission", { length: 128 }).$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.groupId, table.permission],
    }),
  }),
);

export const sections = mysqlTable("section", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  boardId: varchar("board_id", { length: 64 })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  kind: text("kind").$type<SectionKind>().notNull(),
  xOffset: int("x_offset").notNull(),
  yOffset: int("y_offset").notNull(),
  width: int("width"),
  height: int("height"),
  name: text("name"),
  parentSectionId: varchar("parent_section_id", { length: 64 }).references((): AnyMySqlColumn => sections.id, {
    onDelete: "cascade",
  }),
});

export const items = mysqlTable("item", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  sectionId: varchar("section_id", { length: 64 })
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  kind: text("kind").$type<WidgetKind>().notNull(),
  xOffset: int("x_offset").notNull(),
  yOffset: int("y_offset").notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  options: text("options").default('{"json": {}}').notNull(), // empty superjson object
  advancedOptions: text("advanced_options").default('{"json": {}}').notNull(), // empty superjson object
});

export const apps = mysqlTable("app", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url").notNull(),
  href: text("href"),
});

export const integrationItems = mysqlTable(
  "integration_item",
  {
    itemId: varchar("item_id", { length: 64 })
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    integrationId: varchar("integration_id", { length: 64 })
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
  id: varchar("icon_id", { length: 64 }).notNull().primaryKey(),
  name: varchar("icon_name", { length: 250 }).notNull(),
  url: text("icon_url").notNull(),
  checksum: text("icon_checksum").notNull(),
  iconRepositoryId: varchar("iconRepository_id", { length: 64 })
    .notNull()
    .references(() => iconRepositories.id, { onDelete: "cascade" }),
});

export const iconRepositories = mysqlTable("iconRepository", {
  id: varchar("iconRepository_id", { length: 64 }).notNull().primaryKey(),
  slug: varchar("iconRepository_slug", { length: 150 }).notNull(),
});

export const serverSettings = mysqlTable("serverSetting", {
  settingKey: varchar("key", { length: 64 }).notNull().unique().primaryKey(),
  value: text("value").default('{"json": {}}').notNull(), // empty superjson object
});

export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const searchEngines = mysqlTable("search_engine", {
  id: varchar("id", { length: 64 }).notNull().primaryKey(),
  iconUrl: text("icon_url").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  short: varchar("short", { length: 8 }).notNull(),
  description: text("description"),
  urlTemplate: text("url_template").notNull(),
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
