import { eq } from "@homarr/db";
import type { Database } from "@homarr/db";
import { assistantConfigurations } from "@homarr/db/schema";
import { assistantProviderRequiresApiKey } from "@homarr/definitions";

/**
 * Instance-level feature switches. These say whether a feature is turned on for the whole Homarr
 * instance, never whether the current user may use it - permission checks stay on the individual
 * procedures.
 *
 * The point of collecting them in one place is that the server can decide, before rendering,
 * whether a feature's client bundle needs to exist on the page at all. A feature that is off must
 * not cost the browser anything.
 */
export interface FeatureFlags {
  assistant: boolean;
}

export const getFeatureFlagsAsync = async (db: Database): Promise<FeatureFlags> => {
  const assistantConfiguration = await db.query.assistantConfigurations.findFirst({
    where: eq(assistantConfigurations.id, "default"),
    columns: { enabled: true, provider: true, modelId: true, encryptedApiKey: true },
  });

  const requiresApiKey = assistantConfiguration
    ? assistantProviderRequiresApiKey(assistantConfiguration.provider)
    : false;

  return {
    assistant: Boolean(
      assistantConfiguration?.enabled &&
      assistantConfiguration.modelId &&
      (!requiresApiKey || assistantConfiguration.encryptedApiKey),
    ),
  };
};
