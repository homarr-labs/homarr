import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { getServerSettingByKeyAsync, updateServerSettingByKeyAsync } from "@homarr/db/queries";
import { themeIds, themeNames } from "@homarr/definitions";
import { brandingServerSettingsSchema, parseBrandingSettings } from "@homarr/server-settings";
import type { ThemeSelection } from "@homarr/validation/theme";
import { customThemeSchema, resolveThemeSelection, themeSelectionSchema } from "@homarr/validation/theme";
import {
  themeControlChangeSchema,
  themeControlGroups,
  themeControls,
  updateThemeDraft,
} from "@homarr/validation/theme-controls";

import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getUserPreferencesAsync, updateUserPreferencesAsync } from "./user/preferences";

const targetSchema = z.strictObject({
  target: z.enum(["user", "server"]).default("user"),
  userId: z.string().min(1).max(128).optional(),
});

const assertServerAdmin = (permissions: readonly string[]) => {
  if (!permissions.includes("admin"))
    throw new TRPCError({ code: "FORBIDDEN", message: "Server themes require admin permission" });
};

export const themeRouter = createTRPCRouter({
  getControls: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Discover a page of theme editor controls with allowed paths, types, bounds, and presets. Filter by group or component, or page using nextOffset until null. These are the controls used by the editor page. Use theme_get to read the active document and theme_update to edit controls. value null resets an override. No theme is changed.",
      },
    })
    .input(
      z
        .object({
          group: z.enum(themeControlGroups).optional(),
          component: z.string().max(48).optional(),
          offset: z.number().int().min(0).max(512).default(0),
          limit: z.number().int().min(1).max(64).default(40),
        })
        .optional(),
    )
    .query(({ input }) => {
      const { group, component, offset = 0, limit = 40 } = input ?? {};
      const filtered = themeControls.filter(
        (control) => (!group || control.group === group) && (!component || control.component === component),
      );
      let nextOffset: number | null = null;
      if (offset + limit < filtered.length) nextOffset = offset + limit;
      return {
        controls: filtered.slice(offset, offset + limit),
        total: filtered.length,
        nextOffset,
        groups: themeControlGroups,
        components: [...new Set(themeControls.flatMap((control) => (control.component ? [control.component] : [])))],
        presets: themeIds.map((id) => ({ id, name: themeNames[id] })),
        userDefault: null,
      };
    }),
  get: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read a user or server theme, its saved custom overrides, and the active starting document for editing. Users inherit the server theme when themeId is null. Omit userId for yourself; reading another user or target server requires admin permission. Control paths are listed by theme_getControls.",
      },
    })
    .input(targetSchema)
    .query(async ({ ctx, input }) => {
      if (input.target === "server") assertServerAdmin(ctx.session.user.permissions);
      const branding = parseBrandingSettings(await getServerSettingByKeyAsync(ctx.db, "branding"));
      let selection: ThemeSelection = branding;
      let userId: string | undefined;
      if (input.target === "user") {
        userId = input.userId ?? ctx.session.user.id;
        const preferences = await getUserPreferencesAsync(ctx, userId);
        selection = { themeId: preferences.themeId, customTheme: preferences.customTheme };
      }
      return {
        target: input.target,
        userId,
        ...selection,
        inherited: selection.themeId === null,
        activeDocument: resolveThemeSelection(branding, selection).document,
        branding,
      };
    }),
  update: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Save theme settings for yourself or a server. Use changes with paths from theme_getControls to edit individual settings; changes merge into the active theme and select Custom. With changes, themeId chooses the starting preset (or null for the server theme); the result is Custom. value null resets that setting. customTheme can replace the full validated document. Without changes, themeId selects a preset, saved custom, or null to return a user to the server theme. Omitted theme data is preserved. Read theme_get first. target server and editing another user require admin permission. Does not execute CSS resources, JavaScript, or component handlers.",
      },
    })
    .input(
      targetSchema
        .extend({
          themeId: themeSelectionSchema.nullable().optional(),
          customTheme: customThemeSchema.nullable().optional(),
          changes: z.array(themeControlChangeSchema).min(1).max(256).optional(),
        })
        .refine(
          (value) => value.themeId !== undefined || value.customTheme !== undefined || value.changes !== undefined,
          "Supply a theme selection, document, or control changes",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.target === "server") assertServerAdmin(ctx.session.user.permissions);
      if (input.target === "server" && input.themeId === null)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a server theme" });
      const branding = parseBrandingSettings(await getServerSettingByKeyAsync(ctx.db, "branding"));
      let current: ThemeSelection = branding;
      const userId = input.userId ?? ctx.session.user.id;
      if (input.target === "user") {
        const preferences = await getUserPreferencesAsync(ctx, userId);
        current = { themeId: preferences.themeId, customTheme: preferences.customTheme };
      }
      let customTheme = current.customTheme;
      if (input.customTheme !== undefined) customTheme = input.customTheme;
      let themeId = current.themeId;
      if (input.themeId !== undefined) themeId = input.themeId;
      else if (input.customTheme || input.changes) themeId = "custom";
      if (input.changes) {
        let startingSelection: ThemeSelection = { ...current, customTheme };
        if (input.themeId !== undefined) startingSelection = { ...startingSelection, themeId: input.themeId };
        if (input.customTheme) startingSelection = { themeId: "custom", customTheme: input.customTheme };
        const document = resolveThemeSelection(branding, startingSelection).document;
        const result = customThemeSchema.safeParse(updateThemeDraft(document, input.changes));
        if (!result.success) throw new TRPCError({ code: "BAD_REQUEST", message: result.error.message });
        customTheme = result.data;
        themeId = "custom";
      }
      if (themeId === "custom" && !customTheme)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Save a custom theme before selecting it" });
      if (input.target === "server") {
        if (themeId === null) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a server theme" });
        await updateServerSettingByKeyAsync(
          ctx.db,
          "branding",
          brandingServerSettingsSchema.parse({ ...branding, themeId, customTheme }),
        );
      } else {
        await updateUserPreferencesAsync(ctx, userId, { themeId, customTheme });
      }
      return { target: input.target, themeId, customTheme, inherited: themeId === null };
    }),
});
