import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import { apps, boards, groups, invites, itemLayouts, items, searchEngines, serverSettings, users } from "./schema";

export const selectAppSchema = createSelectSchema(apps);
export const selectBoardSchema = createSelectSchema(boards);
export const selectitemSchema = createSelectSchema(items);
export const insertItemSchema = createInsertSchema(items);
export const selectItemLayoutSchema = createSelectSchema(itemLayouts);
export const selectGroupSchema = createSelectSchema(groups);
export const selectInviteSchema = createSelectSchema(invites);
export const selectSearchEnginesSchema = createSelectSchema(searchEngines);
export const selectSeverSettingsSchema = createSelectSchema(serverSettings);
export const selectUserSchema = createSelectSchema(users);
