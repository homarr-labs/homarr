import type { MediaRequest } from "@homarr/integrations/types";

import type { WidgetActivityFacts } from "../../activity";

export const getMediaRequestsActivityFacts = (requests: readonly MediaRequest[]): WidgetActivityFacts => {
  const count = requests.filter(
    ({ status, availability }) =>
      (status === "pending" || status === "approved") &&
      (availability === "pending" ||
        availability === "requested" ||
        availability === "processing" ||
        (status === "pending" && availability === "unknown")),
  ).length;
  return { relevance: count > 0 ? "ongoing" : "quiet", count };
};
