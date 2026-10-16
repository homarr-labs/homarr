import { ApiError } from "../procedure";
import { z } from "zod/v4";

import {
  getGroupMemberManagementType,
  getIntegrationsWithPermissionsAsync,
  getLocallyManageableProviders,
  isProviderEnabled,
} from "@homarr/auth/server";
import { env as authEnv } from "@homarr/auth/env";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { and, eq } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";
import { boards, groups, invites, users } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import { env as dockerEnv } from "@homarr/docker/env";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { env } from "../env";
import { isOnboardingClaimValidAsync } from "../onboarding-claim";
import { createApiRouter, permissionRequiredProcedure, protectedProcedure, publicProcedure } from "../procedure";
import { normalizeOnboardingStep } from "./onboard/onboard-queries";

// Small presentation reads formerly performed directly by Next.js. Permissions
// are enforced here so any frontend can consume these without database access.
export const frontendRouter = createApiRouter({
  settings: publicProcedure.query(async ({ context }) => {
    const { analytics: _analytics, ...settings } = await getServerSettingsAsync(context.db);
    return settings;
  }),
  routing: publicProcedure.query(async ({ context }) => {
    const [state, settings] = await Promise.all([
      context.db.query.onboarding.findFirst(),
      getServerSettingsAsync(context.db),
    ]);
    return { step: normalizeOnboardingStep(state?.step), defaultLocale: settings.culture.defaultLocale };
  }),
  runtime: publicProcedure.query(() => ({
    databaseDriver: dbEnv.DRIVER,
    groupMemberManagementType: getGroupMemberManagementType(),
    locallyManageableProviders: getLocallyManageableProviders(),
    credentialsEnabled: isProviderEnabled("credentials"),
    authProviders: authEnv.AUTH_PROVIDERS,
    oidcClientName: authEnv.AUTH_OIDC_CLIENT_NAME,
    oidcAutoLogin: authEnv.AUTH_OIDC_AUTO_LOGIN,
    logoutRedirectUrl: authEnv.AUTH_LOGOUT_REDIRECT_URL,
    ldapEnabled: isProviderEnabled("ldap"),
    oidcEnabled: isProviderEnabled("oidc"),
    dockerEnabled: dockerEnv.ENABLE_DOCKER,
    kubernetesEnabled: dockerEnv.ENABLE_KUBERNETES,
  })),
  userSettings: protectedProcedure.input(z.object({ userId: z.string().min(1) })).query(async ({ context, input }) => {
    if (context.session.user.id !== input.userId && !context.session.user.permissions.includes("admin")) {
      throw new ApiError({ code: "NOT_FOUND", message: "User not found" });
    }
    return await context.db.query.users.findFirst({
      columns: {
        homeBoardId: true,
        mobileHomeBoardId: true,
        byteUnitSystem: true,
        firstDayOfWeek: true,
        pingIconsEnabled: true,
        enableRightClickOnWidgets: true,
        headerPreferences: true,
        defaultSearchEngineId: true,
        openSearchInNewTab: true,
        ddgBangs: true,
        completedManageTour: true,
        completedBoardTour: true,
      },
      where: eq(users.id, input.userId),
    });
  }),
  invitation: publicProcedure
    .input(z.object({ id: z.string().min(1), token: z.string().min(1) }))
    .query(async ({ context, input }) => {
      if (!isProviderEnabled("credentials") || context.session) return null;
      const invitation = await context.db.query.invites.findFirst({
        where: and(eq(invites.id, input.id), eq(invites.token, input.token)),
        columns: { id: true, token: true, expirationDate: true },
        with: { creator: { columns: { name: true } } },
      });
      if (!invitation || invitation.expirationDate < new Date()) return null;
      return invitation;
    }),
  hasBoards: publicProcedure.query(async ({ context }) => (await context.db.$count(boards)) > 0),
  defaultGroups: permissionRequiredProcedure.requiresPermission("admin").query(
    async ({ context }) =>
      await context.db.query.groups.findMany({
        where: eq(groups.name, everyoneGroup),
        with: { permissions: true },
      }),
  ),
  integrationPermissions: publicProcedure.query(
    async ({ context }) => await getIntegrationsWithPermissionsAsync(context.session),
  ),
  setup: publicProcedure.query(async ({ context }) => {
    const [state, firstUser] = await Promise.all([
      context.db.query.onboarding.findFirst(),
      context.db.query.users.findFirst({ columns: { id: true } }),
    ]);
    const canConfigurePrivileged = context.session?.user.permissions.includes("admin") ?? false;
    const canReadSetupContext =
      canConfigurePrivileged ||
      (!firstUser && (await isOnboardingClaimValidAsync(context.db, context.onboardingClaimToken)));
    const availableBoards: { id: string; name: string; primaryColor: string; secondaryColor: string }[] = [];
    let homeBoardId: string | null | undefined;
    let workshopApiUrl = "";
    let workshopWebUrl = "";
    if (canReadSetupContext) {
      const [defaultGroup, boardRows] = await Promise.all([
        context.db.query.groups.findFirst({ where: eq(groups.name, everyoneGroup), columns: { homeBoardId: true } }),
        context.db.query.boards.findMany({
          columns: { id: true, name: true, primaryColor: true, secondaryColor: true },
        }),
      ]);
      homeBoardId = defaultGroup?.homeBoardId;
      availableBoards.push(...boardRows);
      const urls = resolveHomarrUrlConfig({
        homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
        workshopApiUrl: env.WORKSHOP_API_URL,
        workshopWebUrl: env.WORKSHOP_WEB_URL,
      });
      workshopApiUrl = urls.workshopApiUrl;
      workshopWebUrl = urls.workshopWebUrl;
    }
    let initialBoard = availableBoards.find((board) => board.id === homeBoardId) ?? null;
    if (!initialBoard && availableBoards.length === 1) initialBoard = availableBoards[0] ?? null;
    let databaseDriver: "sqlite" | "postgresql" = "postgresql";
    if (dbEnv.DRIVER === "better-sqlite3") databaseDriver = "sqlite";
    return {
      currentStep: normalizeOnboardingStep(state?.step),
      databaseDriver,
      externalAuthEnabled: isProviderEnabled("ldap") || isProviderEnabled("oidc"),
      dockerConfigured: canReadSetupContext && dockerEnv.ENABLE_DOCKER,
      kubernetesConfigured: canReadSetupContext && dockerEnv.ENABLE_KUBERNETES,
      workshopApiUrl,
      workshopUrl: workshopWebUrl,
      canConfigurePrivileged,
      hasUsers: Boolean(firstUser),
      initialBoard,
      availableBoards: availableBoards.map(({ id, name }) => ({ id, name })),
    };
  }),
});
