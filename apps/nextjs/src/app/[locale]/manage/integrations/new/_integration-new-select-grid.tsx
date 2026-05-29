"use client";

import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/definitions";

import { IntegrationSelectGrid } from "~/components/integration/integration-select-grid";

interface IntegrationNewSelectGridProps {
  enableMockIntegration: boolean;
}

export const IntegrationNewSelectGrid = ({ enableMockIntegration }: IntegrationNewSelectGridProps) => {
  const router = useRouter();

  const handleSelect = (kind: IntegrationKind) => {
    router.push(`/manage/integrations/new?kind=${kind}`);
  };

  return <IntegrationSelectGrid onSelect={handleSelect} enableMockIntegration={enableMockIntegration} />;
};
