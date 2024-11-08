import type { AdapterAccount } from "@auth/core/adapters";
import type { DayOfWeek } from "@mantine/dates";
import type { InferSelectModel } from "drizzle-orm";
import { relations, sql } from "drizzle-orm";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { blob, index, int, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const apiKeys = sqliteTable("apiKey", {
  id: text("id").notNull().primaryKey(),
  apiKey: text("apiKey").notNull(),
  salt: text("salt").notNull(),
  userId: text("userId")
    .notNull()
    .references((): AnySQLiteColumn => users.id, {
      onDelete: "cascade",
    }),
});

export const users = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email"),
  emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
  image: text("image"),
  password: text("password"),
  salt: text("salt"),
  provider: text("provider").$type<SupportedAuthProvider>().default("credentials").notNull(),
  homeBoardId: text("homeBoardId").references((): AnySQLiteColumn => boards.id, {
    onDelete: "set null",
  }),
  colorScheme: text("colorScheme").$type<ColorScheme>().default("dark").notNull(),
  firstDayOfWeek: int("firstDayOfWeek").$type<DayOfWeek>().default(1).notNull(), // Defaults to Monday
  pingIconsEnabled: int("pingIconsEnabled", { mode: "boolean" }).default(false).notNull(),
  openAppsInNewTab: int("openAppsInNewTab", { mode: "boolean" }).default(false).notNull(),
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
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const groupMembers = sqliteTable(
  "groupMember",
  {
    groupId: text("groupId")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("userId")
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
  id: text("id").notNull().primaryKey(),
  name: text("name").unique().notNull(),
  ownerId: text("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
});

export const groupPermissions = sqliteTable("groupPermission", {
  groupId: text("groupId")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  permission: text("permission").$type<GroupPermissionKey>().notNull(),
});

export const invites = sqliteTable("invite", {
  id: text("id").notNull().primaryKey(),
  token: text("token").notNull().unique(),
  expirationDate: int("expiration_date", {
    mode: "timestamp",
  }).notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const medias = sqliteTable("media", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  content: blob("content", { mode: "buffer" }).$type<Buffer>().notNull(),
  contentType: text("content_type").notNull(),
  size: int("size").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  creatorId: text("creator_id").references(() => users.id, { onDelete: "set null" }),
});

export const integrations = sqliteTable(
  "integration",
  {
    id: text("id").notNull().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    kind: text("kind").$type<IntegrationKind>().notNull(),
  },
  (integrations) => ({
    kindIdx: index("integration__kind_idx").on(integrations.kind),
  }),
);

export const integrationSecrets = sqliteTable(
  "integrationSecret",
  {
    kind: text("kind").$type<IntegrationSecretKind>().notNull(),
    value: text("value").$type<`${string}.${string}`>().notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .$onUpdateFn(() => new Date())
      .notNull(),
    integrationId: text("integration_id")
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
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission").$type<IntegrationPermission>().notNull(),
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
    integrationId: text("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: text("permission").$type<IntegrationPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.integrationId, table.groupId, table.permission],
    }),
  }),
);

export const boards = sqliteTable("board", {
  id: text("id").notNull().primaryKey(),
  name: text("name").unique().notNull(),
  isPublic: int("is_public", { mode: "boolean" }).default(false).notNull(),
  creatorId: text("creator_id").references(() => users.id, {
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

export const boardUserPermissions = sqliteTable(
  "boardUserPermission",
  {
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: text("permission").$type<BoardPermission>().notNull(),
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
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    permission: text("permission").$type<BoardPermission>().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.boardId, table.groupId, table.permission],
    }),
  }),
);

export const sections = sqliteTable("section", {
  id: text("id").notNull().primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  kind: text("kind").$type<SectionKind>().notNull(),
  xOffset: int("x_offset").notNull(),
  yOffset: int("y_offset").notNull(),
  width: int("width"),
  height: int("height"),
  name: text("name"),
  parentSectionId: text("parent_section_id").references((): AnySQLiteColumn => sections.id, {
    onDelete: "cascade",
  }),
});

export const items = sqliteTable("item", {
  id: text("id").notNull().primaryKey(),
  sectionId: text("section_id")
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

export const apps = sqliteTable("app", {
  id: text("id").notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url").notNull(),
  href: text("href"),
});

export const integrationItems = sqliteTable(
  "integration_item",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    integrationId: text("integration_id")
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
  id: text("icon_id").notNull().primaryKey(),
  name: text("icon_name").notNull(),
  url: text("icon_url").notNull(),
  checksum: text("icon_checksum").notNull(),
  iconRepositoryId: text("iconRepository_id")
    .notNull()
    .references(() => iconRepositories.id, { onDelete: "cascade" }),
});

export const iconRepositories = sqliteTable("iconRepository", {
  id: text("iconRepository_id").notNull().primaryKey(),
  slug: text("iconRepository_slug").notNull(),
});

export const serverSettings = sqliteTable("serverSetting", {
  settingKey: text("key").notNull().unique().primaryKey(),
  value: text("value").default('{"json": {}}').notNull(), // empty superjson object
});

export const apiKeyRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const searchEngines = sqliteTable("search_engine", {
  id: text("id").notNull().primaryKey(),
  iconUrl: text("icon_url").notNull(),
  name: text("name").notNull(),
  short: text("short").notNull(),
  description: text("description"),
  urlTemplate: text("url_template"),
  type: text("type").$type<SearchEngineType>().notNull().default("generic"),
  integrationId: text("integration_id").references(() => integrations.id, { onDelete: "cascade" }),
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
  medias: many(medias),
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

export type User = InferSelectModel<typeof users>;
export type Account = InferSelectModel<typeof accounts>;
export type Session = InferSelectModel<typeof sessions>;
export type VerificationToken = InferSelectModel<typeof verificationTokens>;
export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationSecret = InferSelectModel<typeof integrationSecrets>;
