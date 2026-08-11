import { AssistantProviderActivity } from "@site/src/components/assistant-provider/assistant-provider-activity";

import type { CommonWidgetProps } from "./card";
import { WidgetCard } from "./card";

export const AssistantProviderWidget = ({ className }: CommonWidgetProps) => (
  <WidgetCard width={2} className={className}>
    <AssistantProviderActivity compact />
  </WidgetCard>
);
