import { cache } from "react";

import { db } from "@homarr/db";
import { getServerSettingsAsync } from "@homarr/db/queries";

// One settings snapshot per RSC request, shared by the root layout, theme, and
// widget prefetching. React invalidates this cache between requests.
export const getRscServerSettingsAsync = cache(async () => await getServerSettingsAsync(db));
