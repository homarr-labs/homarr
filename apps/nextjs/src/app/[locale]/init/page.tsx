import { headers } from "next/headers";

import { getOnboardingClaimTokenFromCookieHeader, isOnboardingClaimValidAsync } from "@homarr/api/onboarding-claim";
import { normalizeOnboardingStep } from "@homarr/api/onboarding-step";
import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { dbEnv } from "@homarr/core/infrastructure/db/env";
import { db, eq } from "@homarr/db";
import { groups } from "@homarr/db/schema";
import { everyoneGroup } from "@homarr/definitions";
import { env as dockerEnv } from "@homarr/docker/env";
import { OnboardingStudio } from "@homarr/onboarding";
import { resolveHomarrUrlConfig } from "@homarr/workshop/schema";

import { DatabaseRestoreFlow } from "~/components/backup";
import { env } from "~/env";

export default async function InitPage() {
  const [state, session, requestHeaders, firstUser] = await Promise.all([
    db.query.onboarding.findFirst(),
    auth(),
    headers(),
    db.query.users.findFirst({ columns: { id: true } }),
  ]);
  const canConfigurePrivileged = session?.user.permissions.includes("admin") ?? false;
  const onboardingClaim = getOnboardingClaimTokenFromCookieHeader(requestHeaders.get("cookie"));
  const canReadSetupContext =
    canConfigurePrivileged || (!firstUser && (await isOnboardingClaimValidAsync(db, onboardingClaim)));
  const [defaultGroup, availableBoards] = canReadSetupContext
    ? await Promise.all([
        db.query.groups.findFirst({
          where: eq(groups.name, everyoneGroup),
          columns: { homeBoardId: true },
        }),
        db.query.boards.findMany({ columns: { id: true, name: true } }),
      ])
    : [undefined, []];
  const homeBoardId = defaultGroup?.homeBoardId;
  const homeBoard = availableBoards.find((board) => board.id === homeBoardId);
  const initialBoard = homeBoard ?? (availableBoards.length === 1 ? availableBoards[0] : null);
  const currentStep = normalizeOnboardingStep(state?.step);
  const databaseDriver =
    dbEnv.DRIVER === "better-sqlite3" ? "sqlite" : dbEnv.DRIVER === "mysql2" ? "mysql" : "postgresql";
  const { workshopApiUrl, workshopWebUrl } = canReadSetupContext
    ? resolveHomarrUrlConfig({
        homarrWebsiteUrl: env.HOMARR_WEBSITE_URL,
        workshopApiUrl: env.WORKSHOP_API_URL,
        workshopWebUrl: env.WORKSHOP_WEB_URL,
      })
    : { workshopApiUrl: "", workshopWebUrl: "" };
  const baseUrl = extractBaseUrlFromHeaders(requestHeaders);

  return (
    <OnboardingStudio
      environment={{
        currentStep,
        databaseDriver,
        externalAuthEnabled: isProviderEnabled("ldap") || isProviderEnabled("oidc"),
        dockerConfigured: canReadSetupContext && dockerEnv.ENABLE_DOCKER,
        kubernetesConfigured: canReadSetupContext && dockerEnv.ENABLE_KUBERNETES,
        workshopApiUrl,
        workshopUrl: workshopWebUrl,
        mcpEndpoint: `${baseUrl}/api/mcp`,
        canConfigurePrivileged,
        hasUsers: Boolean(firstUser),
        initialBoard: initialBoard ?? null,
        availableBoards,
      }}
      sqliteRestore={databaseDriver === "sqlite" ? <DatabaseRestoreFlow variant="standalone" /> : undefined}
    />
  );
}
