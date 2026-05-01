"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import type { IntegrationKind } from "@homarr/definitions";

import { IntegrationSelectGrid } from "./integration-select-grid";

interface IntegrationPickerPageProps {
  enableMockIntegration: boolean;
}

export const IntegrationPickerPage = ({ enableMockIntegration }: IntegrationPickerPageProps) => {
  const router = useRouter();

  const handleSelect = useCallback(
    (kind: IntegrationKind) => {
      router.push(`/manage/integrations/new?kind=${kind}`);
    },
    [router],
  );

  return <IntegrationSelectGrid onSelect={handleSelect} enableMockIntegration={enableMockIntegration} />;
};
