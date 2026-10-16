import { cache } from "react";

import { api } from "./server";

export const getRscServerSettingsAsync = cache(async () => await api.frontend.settings.query());
