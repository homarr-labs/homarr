import type { CoolifyInstanceInfo } from "@homarr/integrations/types";

import type { WidgetComponentProps } from "../definition";

export const COOLIFY_ICON_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg";

export interface InstanceData {
  integrationId: string;
  integrationName: string;
  integrationUrl: string;
  instanceInfo: CoolifyInstanceInfo;
  updatedAt: Date;
}

export type CoolifyOptions = WidgetComponentProps<"coolify">["options"];
