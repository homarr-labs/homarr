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

import { createTRPCRouter, permissionRequiredProcedure } from "../trpc";
const adminProcedure = permissionRequiredProcedure.requiresPermission("admin");

export const themeRouter = createTRPCRouter({
  getControls: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Discover a page of global theme editor controls with allowed paths, types, bounds, and presets. Requires admin permission. Filter by group or component, or page using nextOffset until null. These are the controls used by the editor page. Use theme_get to read the active document and theme_update to edit controls. value null resets an override. No theme is changed.",
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
        scope: "server",
      };
    }),
  get: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Read the global server theme, saved custom overrides, and active starting document for editing. Requires admin permission. Control paths are listed by theme_getControls.",
      },
    })
    .input(z.strictObject({}).optional())
    .query(async ({ ctx }) => {
      const branding = parseBrandingSettings(await getServerSettingByKeyAsync(ctx.db, "branding"));
      return {
        themeId: branding.themeId,
        customTheme: branding.customTheme,
        activeDocument: resolveThemeSelection(branding).document,
        branding,
      };
    }),
  update: adminProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Save the global server theme for all users. Requires admin permission. Use changes with paths from theme_getControls to edit individual settings; changes merge into the active theme and select Custom. With changes, themeId chooses the starting preset. value null resets that setting. customTheme can replace the full validated document. Without changes, themeId selects a preset or saved custom. Omitted theme data is preserved. Read theme_get first. customTheme.customCss includes up to 16 KB of global CSS; selecting a preset replaces its active CSS too. CSS applies to the entire instance and can load external resources. Does not allow JavaScript callbacks or component handlers.",
      },
    })
    .input(
      z
        .strictObject({
          themeId: themeSelectionSchema.optional(),
          customTheme: customThemeSchema.nullable().optional(),
          changes: z.array(themeControlChangeSchema).min(1).max(256).optional(),
        })
        .refine(
          (value) => value.themeId !== undefined || value.customTheme !== undefined || value.changes !== undefined,
          "Supply a theme selection, document, or control changes",
        ),
    )
    .mutation(async ({ ctx, input }) => {
      const branding = parseBrandingSettings(await getServerSettingByKeyAsync(ctx.db, "branding"));
      const current: ThemeSelection = branding;
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
      await updateServerSettingByKeyAsync(
        ctx.db,
        "branding",
        brandingServerSettingsSchema.parse({ ...branding, themeId, customTheme }),
      );
      return { themeId, customTheme };
    }),
});
