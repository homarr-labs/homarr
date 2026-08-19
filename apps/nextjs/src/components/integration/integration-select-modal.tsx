"use client";

import { useState } from "react";
import { Group, ScrollArea, Title, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconX } from "@tabler/icons-react";

import type { IntegrationKind } from "@homarr/definitions";
import { getIntegrationName } from "@homarr/definitions";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
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
  initialKind?: IntegrationKind;
  initialUrl?: string;
  initialName?: string;
}

export const IntegrationSelectModal = createModal<IntegrationSelectModalProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const [step, setStep] = useState<"select" | "form">(innerProps.initialKind ? "form" : "select");
  const [selectedKind, setSelectedKind] = useState<IntegrationKind | null>(innerProps.initialKind ?? null);
  const { openModal: openCompletionModal } = useModalAction(IntegrationCompletionModal);

  const handleSelect = (kind: IntegrationKind) => {
    setSelectedKind(kind);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedKind(null);
  };
  const handleFormBack = innerProps.initialKind ? actions.closeModal : handleBack;

  const handleSuccess = (result?: CreatedIntegrationResult) => {
    actions.closeModal();
    if (innerProps.onSuccess) {
      innerProps.onSuccess(result);
    } else if (result) {
      openCompletionModal({ result, boardId: innerProps.completionBoardId });
    }
  };

  if (step === "form" && selectedKind) {
    let HeaderIcon = IconArrowLeft;
    let headerLabel = t("common.action.previous");
    if (innerProps.initialKind) {
      HeaderIcon = IconX;
      headerLabel = t("common.action.close");
    }

    return (
      <ScrollArea.Autosize mah="80vh">
        <UnstyledButton mb="md" onClick={handleFormBack} aria-label={headerLabel}>
          <Group gap="xs">
            <HeaderIcon size={18} />
            <IntegrationAvatar kind={selectedKind} size="sm" />
            <Title order={4}>{getIntegrationName(selectedKind)}</Title>
          </Group>
        </UnstyledButton>
        <NewIntegrationForm
          kind={selectedKind}
          initialUrl={innerProps.initialUrl}
          initialName={innerProps.initialName}
          onSuccess={handleSuccess}
          onCancel={handleFormBack}
        />
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
