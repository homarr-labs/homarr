import { getRscServerSettingsAsync } from "@homarr/api/server-settings-server";
import { getRscAssistantAvailabilityAsync } from "@homarr/api/assistant-availability-server";
import { getRscUserSettingsAsync } from "@homarr/api/user-server";
import type { Session } from "@homarr/auth";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { ColorScheme } from "@homarr/definitions";

import type { AssistantAvailability } from "~/components/assistant/assistant-gate";

const logger = createLogger({ module: "rootLayout" });

export const loadRootLayoutDataAsync = async (sessionPromise: Promise<Session | null>) => {
  const settingsPromise = getRscServerSettingsAsync();
  const userPromise = sessionPromise.then(async (session) => {
    if (!session) return null;
    try {
      return (await getRscUserSettingsAsync(session.user.id)) ?? null;
    } catch (cause) {
      logger.error(new Error("Failed to load the authenticated user in the root layout", { cause }));
      return null;
    }
  });
  const availabilityPromise = sessionPromise.then(async (session): Promise<AssistantAvailability> => {
    if (!session) return "unauthenticated";
    try {
      if (await getRscAssistantAvailabilityAsync()) return "enabled";
      return "unconfigured";
    } catch {
      return "error";
    }
  });
  const [session, user, serverSettings, assistantAvailability] = await Promise.all([
    sessionPromise,
    userPromise,
    settingsPromise,
    availabilityPromise,
  ]);
  return { session, user, serverSettings, assistantAvailability };
};

export type RootLayoutData = Awaited<ReturnType<typeof loadRootLayoutDataAsync>> & { colorScheme: ColorScheme };
