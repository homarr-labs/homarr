import { mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

export const proxySchema = {
  onboarding: mysqlTable("onboarding", {
    step: varchar("step", { length: 32 }).notNull(),
  }),
  serverSettings: mysqlTable("serverSetting", {
    settingKey: varchar("setting_key", { length: 64 }).notNull(),
    value: text("value").notNull(),
  }),
};
