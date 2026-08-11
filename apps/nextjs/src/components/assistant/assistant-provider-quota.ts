import type { WorkshopAssistantUsage } from "@homarr/workshop/schema";
import type { AssistantProvider } from "@homarr/definitions";

export type AssistantProviderQuotaLevel = "ok" | "warning" | "bad" | "dead";

export const getAssistantProviderQuotaLevel = (
  usage: Pick<WorkshopAssistantUsage, "limit" | "remaining">,
): AssistantProviderQuotaLevel => {
  if (usage.remaining === 0 || usage.limit === 0) return "dead";
  const remainingRatio = usage.remaining / usage.limit;
  if (remainingRatio <= 0.2) return "bad";
  if (remainingRatio <= 0.5) return "warning";
  return "ok";
};

export const isAssistantProviderUnavailable = ({
  provider,
  signedIn,
  remaining,
}: {
  provider: AssistantProvider | null;
  signedIn: boolean;
  remaining: number | undefined;
}) => provider === "homarr" && (!signedIn || remaining === 0);
