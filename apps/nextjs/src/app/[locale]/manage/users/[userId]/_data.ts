import { cache } from "react";

import { api } from "@homarr/api/server";

// React clears this cache between requests; distinct target users keep distinct entries.
export const getUserEditDataAsync = cache((userId: string) => api.user.getById({ userId }));
