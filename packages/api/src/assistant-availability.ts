import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { assistantConfigurations } from "@homarr/db/schema";
import { assistantProviderRequiresApiKey } from "@homarr/definitions";

import { env } from "./env";

export const getAssistantAvailabilityAsync = async (database: Database) => {
  if (env.DEMO_MODE) return true;

  const configuration = await database.query.assistantConfigurations.findFirst({
    where: eq(assistantConfigurations.id, "default"),
    columns: {
      enabled: true,
      modelId: true,
      provider: true,
      encryptedApiKey: true,
    },
  });
  return Boolean(
    configuration?.enabled &&
    configuration.modelId &&
    (!assistantProviderRequiresApiKey(configuration.provider) || configuration.encryptedApiKey),
  );
};
