import type { RouterOutputs } from "@homarr/api";

export type HermesAgentInstance = RouterOutputs["widget"]["hermesAgent"]["getOverviews"][number];
export type HermesAgentSuccessInstance = HermesAgentInstance & {
  overview: NonNullable<HermesAgentInstance["overview"]>;
  updatedAt: NonNullable<HermesAgentInstance["updatedAt"]>;
  error: null;
};
export type HermesAgentWidgetOverview = HermesAgentSuccessInstance["overview"];
export type HermesAgentDetails = NonNullable<HermesAgentWidgetOverview["details"]>;
export type HermesPlatformDetail = HermesAgentDetails["platforms"][number];
export type HermesSessionDetail = HermesAgentDetails["sessions"][number];
export type HermesJobDetail = HermesAgentDetails["jobs"][number];
export type HermesSkillDetail = HermesAgentDetails["skills"][number];
