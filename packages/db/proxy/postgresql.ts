import { pgTable, text } from "drizzle-orm/pg-core";

export const proxySchema = {
  onboarding: pgTable("onboarding", {
    step: text("step").notNull(),
  }),
  serverSettings: pgTable("serverSetting", {
    settingKey: text("setting_key").notNull(),
    value: text("value").notNull(),
  }),
};
