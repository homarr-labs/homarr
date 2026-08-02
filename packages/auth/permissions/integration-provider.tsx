"use client";

import type { PropsWithChildren } from "react";
import { createContext, useContext } from "react";

import type { IntegrationKind } from "@homarr/definitions";

interface IntegrationContextProps {
  integrations: {
    id: string;
    name: string;
    url: string;
    kind: IntegrationKind;
    permissions: {
      hasFullAccess: boolean;
      hasInteractAccess: boolean;
      hasUseAccess: boolean;
    };
  }[];
}

const IntegrationContext = createContext<IntegrationContextProps | null>(null);

export const IntegrationProvider = ({ integrations, children }: PropsWithChildren<IntegrationContextProps>) => {
  return <IntegrationContext.Provider value={{ integrations }}>{children}</IntegrationContext.Provider>;
};

const useIntegrationContext = () => {
  const context = useContext(IntegrationContext);

  if (!context) {
    throw new Error("Integration hooks must be used within an IntegrationProvider");
  }

  return context;
};

export const useIntegrations = () => useIntegrationContext().integrations;

export const useIntegrationsWithUseAccess = () =>
  useIntegrationContext().integrations.filter((integration) => integration.permissions.hasUseAccess);

export const useIntegrationsWithInteractAccess = () => {
  const context = useIntegrationContext();
  return context.integrations.filter((integration) => integration.permissions.hasInteractAccess);
};

export const useIntegrationsWithFullAccess = () => {
  const context = useIntegrationContext();
  return context.integrations.filter((integration) => integration.permissions.hasFullAccess);
};
