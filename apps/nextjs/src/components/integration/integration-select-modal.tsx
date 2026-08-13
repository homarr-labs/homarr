"use client";

import { useState } from "react";
import { Group, ScrollArea, Title } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { IntegrationAvatar } from "@homarr/ui";

import { NewIntegrationForm } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import type { CreatedIntegrationResult } from "~/app/[locale]/manage/integrations/new/_integration-new-form";
import { IntegrationSelectGrid } from "./integration-select-grid";
import { IntegrationCompletionModal } from "./integration-completion-modal";

interface IntegrationSelectModalProps {
  onSuccess?: (result?: CreatedIntegrationResult) => void;
  enableMockIntegration?: boolean;
  allowedKinds?: readonly IntegrationKind[];
  completionBoardId?: string;
}

export const IntegrationSelectModal = createModal<IntegrationSelectModalProps>(({ actions, innerProps }) => {
  const [step, setStep] = useState<"select" | "form">("select");
  const [selectedKind, setSelectedKind] = useState<IntegrationKind | null>(null);
  const { openModal: openCompletionModal } = useModalAction(IntegrationCompletionModal);

  const handleSelect = (kind: IntegrationKind) => {
    setSelectedKind(kind);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedKind(null);
  };

  const handleSuccess = (result?: CreatedIntegrationResult) => {
    actions.closeModal();
    if (innerProps.onSuccess) {
      innerProps.onSuccess(result);
    } else if (result) {
      openCompletionModal({ result, boardId: innerProps.completionBoardId });
    }
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

  return (
    <IntegrationSelectGrid
      onSelect={handleSelect}
      enableMockIntegration={innerProps.enableMockIntegration}
      allowedKinds={innerProps.allowedKinds}
    />
  );
}).withOptions({
  defaultTitle: (t) => t("integration.action.create"),
  size: modalSizeSelect,
});
