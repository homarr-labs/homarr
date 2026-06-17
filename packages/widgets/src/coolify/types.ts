import type { CoolifyInstanceInfo } from "@homarr/integrations/types";

import type { WidgetComponentProps } from "../definition";

export const COOLIFY_ICON_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/coolify.svg";
export const COOLIFY_BRAND_COLOR = "#8B5CF6";

export interface InstanceData {
  integrationId: string;
  integrationName: string;
  integrationUrl: URL;
  instanceInfo: CoolifyInstanceInfo;
  updatedAt: Date;
}

export type CoolifyOptions = WidgetComponentProps<"coolify">["options"];
