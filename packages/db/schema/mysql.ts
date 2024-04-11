import type { AdapterAccount } from "@auth/core/adapters";
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  int,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import type {
  BackgroundImageAttachment,
  BackgroundImageRepeat,
  BackgroundImageSize,
  BoardPermission,
  IntegrationKind,
  IntegrationSecretKind,
  SectionKind,
  WidgetKind,
} from "@homarr/definitions";
import {
  backgroundImageAttachments,
  backgroundImageRepeats,
  backgroundImageSizes,
} from "@homarr/definitions";

export const users = mysqlTable("user", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  name: text("name"),
  email: text("email"),
  emailVerified: timestamp("emailVerified"),
  image: text("image"),
  password: text("password"),
  salt: text("salt"),
});

export const accounts = mysqlTable(
  "account",
  {
    userId: varchar("userId", { length: 256 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccount["type"]>().notNull(),
    provider: varchar("provider", { length: 256 }).notNull(),
    providerAccountId: varchar("providerAccountId", { length: 256 }).notNull(),
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
    sessionToken: varchar("sessionToken", { length: 512 })
      .notNull()
      .primaryKey(),
    userId: varchar("userId", { length: 256 })
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
    identifier: varchar("identifier", { length: 256 }).notNull(),
    token: varchar("token", { length: 512 }).notNull(),
    expires: timestamp("expires").notNull(),
  },
  (verificationToken) => ({
    compoundKey: primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  }),
);

export const invites = mysqlTable("invite", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  expirationDate: timestamp("expiration_date").notNull(),
  creatorId: varchar("creator_id", { length: 256 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const integrations = mysqlTable(
  "integration",
  {
    id: varchar("id", { length: 256 }).notNull().primaryKey(),
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
    kind: varchar("kind", { length: 16 })
      .$type<IntegrationSecretKind>()
      .notNull(),
    value: text("value").$type<`${string}.${string}`>().notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    integrationId: varchar("integration_id", { length: 256 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (integrationSecret) => ({
    compoundKey: primaryKey({
      columns: [integrationSecret.integrationId, integrationSecret.kind],
    }),
    kindIdx: index("integration_secret__kind_idx").on(integrationSecret.kind),
    updatedAtIdx: index("integration_secret__updated_at_idx").on(
      integrationSecret.updatedAt,
    ),
  }),
);

export const boards = mysqlTable("board", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  name: varchar("name", { length: 256 }).unique().notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
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

export const boardPermissions = mysqlTable(
  "boardPermission",
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

export const sections = mysqlTable("section", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  boardId: varchar("board_id", { length: 256 })
    .notNull()
    .references(() => boards.id, { onDelete: "cascade" }),
  kind: text("kind").$type<SectionKind>().notNull(),
  position: int("position").notNull(),
  name: text("name"),
});

export const items = mysqlTable("item", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  sectionId: varchar("section_id", { length: 256 })
    .notNull()
    .references(() => sections.id, { onDelete: "cascade" }),
  kind: text("kind").$type<WidgetKind>().notNull(),
  xOffset: int("x_offset").notNull(),
  yOffset: int("y_offset").notNull(),
  width: int("width").notNull(),
  height: int("height").notNull(),
  options: text("options").default('{"json": {}}').notNull(), // empty superjson object
});

export const apps = mysqlTable("app", {
  id: varchar("id", { length: 256 }).notNull().primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url").notNull(),
  href: text("href"),
});

export const integrationItems = mysqlTable(
  "integration_item",
  {
    itemId: varchar("item_id", { length: 256 })
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    integrationId: varchar("integration_id", { length: 256 })
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.itemId, table.integrationId],
    }),
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
  boards: many(boards),
  boardPermissions: many(boardPermissions),
  invites: many(invites),
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

export const boardPermissionRelations = relations(
  boardPermissions,
  ({ one }) => ({
    user: one(users, {
      fields: [boardPermissions.userId],
      references: [users.id],
    }),
    board: one(boards, {
      fields: [boardPermissions.boardId],
      references: [boards.id],
    }),
  }),
);

export const integrationRelations = relations(integrations, ({ many }) => ({
  secrets: many(integrationSecrets),
  items: many(integrationItems),
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

export const boardRelations = relations(boards, ({ many, one }) => ({
  sections: many(sections),
  creator: one(users, {
    fields: [boards.creatorId],
    references: [users.id],
  }),
  permissions: many(boardPermissions),
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

export const integrationItemRelations = relations(
  integrationItems,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [integrationItems.integrationId],
      references: [integrations.id],
    }),
    item: one(items, {
      fields: [integrationItems.itemId],
      references: [items.id],
    }),
  }),
);
