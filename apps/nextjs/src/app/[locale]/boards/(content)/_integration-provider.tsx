"use client";

import type { PropsWithChildren } from "react";

import type { RouterOutputs } from "@homarr/api";
import { IntegrationProvider } from "@homarr/auth/client";

interface Props {
  initialIntegrations: RouterOutputs["integration"]["all"];
}

export const BoardIntegrationProvider = ({ initialIntegrations, children }: PropsWithChildren<Props>) => {
  return <IntegrationProvider integrations={initialIntegrations}>{children}</IntegrationProvider>;
};
