import "server-only";

import { cache } from "react";

import { db } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";

// ponytail: React cache() dedupes within a single request render.
// The `use cache` layer (when enabled) dedupes across requests.
// Keep both: inner avoids repeated deserialization of cached payload per render.
export const getRscServerSettingsAsync = cache(async () => {
  return await getServerSettingsAsync(db);
});
