import { useMemo } from "react";

import { createWazuhDashboardLinks } from "./links";

export const useWazuhLinks = (dashboardUrl: string | null | undefined) =>
  useMemo(() => createWazuhDashboardLinks(dashboardUrl), [dashboardUrl]);
