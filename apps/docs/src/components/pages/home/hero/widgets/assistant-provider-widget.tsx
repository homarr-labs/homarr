import { AssistantProviderActivity } from "@site/src/components/assistant-provider/assistant-provider-activity";
import clsx from "clsx";

import type { CommonWidgetProps } from "./card";
import { WidgetCard } from "./card";

export const AssistantProviderWidget = ({ className }: CommonWidgetProps) => (
  <WidgetCard width={2} className={clsx("!items-stretch !justify-stretch overflow-hidden !p-0", className)}>
    <AssistantProviderActivity compact />
  </WidgetCard>
);
