import { cache } from "react";

import { api } from "./server";

export const getRscUserSettingsAsync = cache(
  async (userId: string) => await api.frontend.userSettings.query({ userId }),
);
