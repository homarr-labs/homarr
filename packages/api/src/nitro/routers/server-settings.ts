import { ORPCError } from "@orpc/server";
import { z } from "zod/v4";

import type { inArray as drizzleInArray } from "@homarr/db";
import type { boards } from "@homarr/db/schema";
import {
  authBrandingSchema,
  brandingServerSettingsSchema,
  defaultServerSettingsKeys,
  parseBrandingSettings,
} from "@homarr/server-settings";
import type { ServerSettings } from "@homarr/server-settings";

import { authenticatedProcedure, sourceProcedure, sourceProjectionMeta } from "../procedure";
import { createSettingsStore } from "./-settings-setup/settings";
import type { SettingsResources } from "./-settings-setup/settings";

const boardSettingsSchema = z.object({
  homeBoardId: z.string().nullable(),
  mobileHomeBoardId: z.string().nullable(),
  enableStatusByDefault: z.boolean(),
  forceDisableStatus: z.boolean(),
}) satisfies z.ZodType<ServerSettings["board"]>;
const brandingUpdateSchema = brandingServerSettingsSchema
  .partial()
  .extend({ authBranding: authBrandingSchema.partial().optional() });
const legacyBrandingSchema = z.object({
  showCustomAppNameOnLogin: z.boolean().optional(),
  showCustomLogoOnLogin: z.boolean().optional(),
  showCustomGreetingOnLogin: z.boolean().optional(),
});
const analyticsUpdateSchema = z.object({ enableGeneral: z.boolean().optional() }).strict();

export interface ServerSettingsProcedureResources extends SettingsResources {
  readonly boards: typeof boards;
  readonly inArray: typeof drizzleInArray;
}

export const serverSettingsImplementedPaths = [
  "serverSettings.getCulture",
  "serverSettings.getAll",
  "serverSettings.getBranding",
  "serverSettings.getBoardSettings",
  "serverSettings.updateBoardSettings",
  "serverSettings.saveSettings",
] as const;
export const serverSettingsPendingPaths = [] as const;

export function createServerSettingsProcedures(resources: ServerSettingsProcedureResources) {
  const store = createSettingsStore(resources);
  const {
    serverSettings,
    boards,
    inArray,
    operators: { eq, and },
  } = resources;
  const getCulture = sourceProcedure({
    path: "serverSettings.getCulture",
    kind: "query",
    access: { kind: "public" },
    demo: "guarded",
  }).handler(async ({ context }) => {
    const culture = await store.read(context.db, "culture");
    return { defaultLocale: culture.defaultLocale };
  });
  const getAll = authenticatedProcedure({
    path: "serverSettings.getAll",
    kind: "query",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  }).handler(({ context }) => store.readAll(context.db));
  const getBranding = sourceProcedure({
    path: "serverSettings.getBranding",
    kind: "query",
    access: { kind: "public" },
    demo: "guarded",
  })
    .meta(
      sourceProjectionMeta({
        mcp: { enabled: true, description: "Returns the public instance branding configuration." },
      }),
    )
    .handler(async ({ context }) => parseBrandingSettings(await store.read(context.db, "branding")));
  const getBoardSettings = authenticatedProcedure({
    path: "serverSettings.getBoardSettings",
    kind: "query",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  })
    .meta(
      sourceProjectionMeta({
        openapi: {
          method: "GET",
          path: "/api/settings/board",
          tags: ["settings"],
          protect: true,
          summary: "Get global board settings",
          description:
            "Return instance desktop and mobile home board IDs and default status behavior. Requires admin permission.",
        },
        mcp: {
          enabled: true,
          description:
            "Get global board defaults, including desktop/mobile home board IDs and status behavior. Requires admin permission",
        },
      }),
    )
    .input(z.void())
    .output(boardSettingsSchema)
    .handler(({ context }) => store.read(context.db, "board"));
  const updateBoardSettings = authenticatedProcedure({
    path: "serverSettings.updateBoardSettings",
    kind: "mutation",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  })
    .meta(
      sourceProjectionMeta({
        openapi: {
          method: "PATCH",
          path: "/api/settings/board",
          tags: ["settings"],
          protect: true,
          summary: "Update global board settings",
          description:
            "Update supplied instance board defaults and return the resulting settings. Home board IDs must reference public boards, or be null to clear the default. Requires admin permission.",
        },
        mcp: {
          enabled: true,
          description:
            "Update global board defaults. Requires admin permission. Optional fields: homeBoardId, mobileHomeBoardId, enableStatusByDefault, forceDisableStatus. Home board IDs must reference public boards or be null",
        },
      }),
    )
    .input(boardSettingsSchema.partial())
    .output(boardSettingsSchema)
    .handler(async ({ context, input }) => {
      const ids = [input.homeBoardId, input.mobileHomeBoardId].filter((id) => id !== undefined && id !== null);
      if (ids.length > 0) {
        const publicBoards = await context.db.query.boards.findMany({
          columns: { id: true },
          where: and(inArray(boards.id, ids), eq(boards.isPublic, true)),
        });
        const publicIds = new Set(publicBoards.map(({ id }) => id));
        const invalid = ids.filter((id) => !publicIds.has(id));
        if (invalid.length > 0)
          throw new ORPCError("BAD_REQUEST", {
            message: `Board settings home board IDs must reference public boards: ${invalid.join(", ")}`,
          });
      }
      const next = { ...(await store.read(context.db, "board")), ...input };
      const existing = await context.db.query.serverSettings.findFirst({
        where: eq(serverSettings.settingKey, "board"),
      });
      if (existing) await store.update(context.db, "board", next);
      else await store.insert(context.db, "board", next);
      return next;
    });
  const saveSettings = authenticatedProcedure({
    path: "serverSettings.saveSettings",
    kind: "mutation",
    access: { kind: "permission", permission: "admin" },
    demo: "guarded",
  })
    .input(z.object({ settingsKey: z.enum(defaultServerSettingsKeys), value: z.record(z.string(), z.unknown()) }))
    .handler(async ({ context, input }) => {
      if (input.settingsKey === "branding") {
        const current = await store.read(context.db, "branding");
        const parsed = brandingUpdateSchema.parse(input.value);
        const legacy = legacyBrandingSchema.parse(input.value);
        const authBranding = { ...current.authBranding };
        authBranding.showAppName = legacy.showCustomAppNameOnLogin ?? authBranding.showAppName;
        authBranding.showLogo = legacy.showCustomLogoOnLogin ?? authBranding.showLogo;
        authBranding.showGreeting = legacy.showCustomGreetingOnLogin ?? authBranding.showGreeting;
        Object.assign(authBranding, parsed.authBranding);
        await store.update(
          context.db,
          "branding",
          brandingServerSettingsSchema.parse({ ...parseBrandingSettings(current), ...parsed, authBranding }),
        );
        return;
      }
      if (input.settingsKey === "analytics") {
        const parsed = analyticsUpdateSchema.parse(input.value);
        await store.updateAnalytics(context.db, (current) => ({ ...current, ...parsed }));
        return;
      }
      const current = await store.read(context.db, input.settingsKey);
      await store.update(context.db, input.settingsKey, {
        ...current,
        ...input.value,
      } as ServerSettings[typeof input.settingsKey]);
    });
  return { getCulture, getAll, getBranding, getBoardSettings, updateBoardSettings, saveSettings };
}
