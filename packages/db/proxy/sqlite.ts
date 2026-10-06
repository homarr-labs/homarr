import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const proxySchema = {
  onboarding: sqliteTable("onboarding", {
    step: text("step").notNull(),
  }),
  serverSettings: sqliteTable("serverSetting", {
    settingKey: text("setting_key").notNull(),
    value: text("value").notNull(),
  }),
};
