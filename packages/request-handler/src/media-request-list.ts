import { z } from "zod/v4";

import type { IntegrationKindByCategory } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { MediaRequest, MediaRequestStatus } from "@homarr/integrations/types";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

const mediaRequestStatusValues = [
  "pending",
  "approved",
  "declined",
  "failed",
  "completed",
] as const satisfies readonly MediaRequestStatus[];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const mediaRequestListInputSchema = z.object({
  statuses: z.array(z.enum(mediaRequestStatusValues)).nonempty(),
  recentDays: z.number().min(0).max(365),
});

export type MediaRequestListInput = z.infer<typeof mediaRequestListInputSchema>;

export const mediaRequestListRequestHandler = createIntegrationRequestHandler<
  MediaRequest[],
  IntegrationKindByCategory<"mediaRequest">,
  MediaRequestListInput
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    const requests = await integrationInstance.getRequestsAsync();
    const cutoff = input.recentDays > 0 ? Date.now() - input.recentDays * MS_PER_DAY : null;
    const statusSet = new Set<MediaRequestStatus>(input.statuses);
    return requests.filter((request) => {
      if (!statusSet.has(request.status)) return false;
      if (cutoff !== null && request.createdAt.getTime() < cutoff) return false;
      return true;
    });
  },
  cacheTtlMs: 60_000,
  fallbackToStaleOnError: true,
});
