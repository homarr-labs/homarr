"use client";

import { useState } from "react";
import { Group, ScrollArea, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { createModal, modalSizeSelect } from "@homarr/modals";
import { IntegrationAvatar } from "@homarr/ui";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { IntegrationSelectGrid } from "./integration-select-grid";

interface IntegrationSelectModalProps {
  onSuccess?: () => void;
  enableMockIntegration?: boolean;
}

export const IntegrationSelectModal = createModal<IntegrationSelectModalProps>(({ actions, innerProps }) => {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedKind, setSelectedKind] = useState<IntegrationKind | null>(null);

  const handleSelect = (kind: IntegrationKind) => {
    setSelectedKind(kind);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedKind(null);
  };

  const handleSuccess = () => {
    innerProps.onSuccess?.();
    actions.closeModal();
  };

  if (step === "form" && selectedKind) {
    return (
      <ScrollArea.Autosize mah="80vh">
        <Group gap="xs" mb="md" style={{ cursor: "pointer" }} onClick={handleBack}>
          <IconArrowLeft size={18} />
          <IntegrationAvatar kind={selectedKind} size="sm" />
          <Title order={4}>{getIntegrationName(selectedKind)}</Title>
        </Group>
        <NewIntegrationForm kind={selectedKind} onSuccess={handleSuccess} onCancel={handleBack} />
      </ScrollArea.Autosize>
    );
  }

  return <IntegrationSelectGrid onSelect={handleSelect} enableMockIntegration={innerProps.enableMockIntegration} />;
}).withOptions({
  defaultTitle: (t) => t("integration.action.create"),
  size: modalSizeSelect,
});
