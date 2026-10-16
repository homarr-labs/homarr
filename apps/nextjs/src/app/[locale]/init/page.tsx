import { headers } from "next/headers";

import { api } from "@homarr/api/server";
import { extractBaseUrlFromHeaders } from "@homarr/common";
import { OnboardingStudio } from "@homarr/onboarding";

import { DatabaseRestoreFlow } from "~/components/backup";
import { getPackageVersion } from "~/versions/package-reader";
import { AssistantConfiguration } from "../manage/assistant/_components/assistant-configuration";

export default async function InitPage() {
  const [environment, requestHeaders] = await Promise.all([api.frontend.setup.query(), headers()]);
  const baseUrl = extractBaseUrlFromHeaders(requestHeaders);
  let sqliteRestore;
  if (environment.databaseDriver === "sqlite") sqliteRestore = <DatabaseRestoreFlow variant="standalone" />;
  let assistantConfiguration;
  if (environment.canConfigurePrivileged) assistantConfiguration = <AssistantConfiguration refreshAfterSave={false} />;

  return (
    <OnboardingStudio
      environment={{
        ...environment,
        version: getPackageVersion(),
        serverOrigin: baseUrl,
        mcpEndpoint: `${baseUrl}/api/mcp`,
      }}
      sqliteRestore={sqliteRestore}
      assistantConfiguration={assistantConfiguration}
    />
  );
}
