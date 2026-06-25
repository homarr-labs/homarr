import type { IntegrationKindByCategory } from "@homarr/definitions";
import type { StreamSession } from "@homarr/integrations";
import { createIntegrationAsync } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const mediaServerRequestHandler = createIntegrationRequestHandler<
  StreamSession[],
  IntegrationKindByCategory<"mediaService">,
  {
    showOnlyPlaying: boolean;
  }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getCurrentSessionsAsync({ showOnlyPlaying: input.showOnlyPlaying });
  },
});
