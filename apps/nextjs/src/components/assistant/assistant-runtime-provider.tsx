"use client";

import type { PropsWithChildren } from "react";
import type { AssistantRuntime, Toolkit } from "@assistant-ui/react";
import { AssistantRuntimeProvider, Tools, useAui } from "@assistant-ui/react";

interface AssistantRuntimeProviderWithToolsProps extends PropsWithChildren {
  runtime: AssistantRuntime;
  toolkit: Toolkit;
}

export const AssistantRuntimeProviderWithTools = ({
  children,
  runtime,
  toolkit,
}: AssistantRuntimeProviderWithToolsProps) => {
  const toolsAui = useAui({ tools: Tools({ toolkit }) });
  return (
    <AssistantRuntimeProvider aui={toolsAui} runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
