import { cache } from "react";

import { api } from "./server";

export const getRscAssistantAvailabilityAsync = cache(
  async () => (await api.assistant.getAvailability.query()).enabled,
);
