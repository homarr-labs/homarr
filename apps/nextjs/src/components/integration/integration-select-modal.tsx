"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Group, ScrollArea, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowLeft, IconX } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
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
  const tCommon = useI18n("common");
  const tIntegration = useI18n("integration");
  const directKind =
    innerProps.initialKind ?? (innerProps.allowedKinds?.length === 1 ? innerProps.allowedKinds[0] : null);
  const isDirectForm = Boolean(directKind);
  const [step, setStep] = useState<"select" | "form">(isDirectForm ? "form" : "select");
  const [selectedKind, setSelectedKind] = useState<IntegrationKind | null>(directKind ?? null);
  const { openModal: openCompletionModal } = useModalAction(IntegrationCompletionModal);
  const { data: integrationData, isError: isIntegrationDataError, refetch } = clientApi.integration.all.useQuery();

  useEffect(() => {
    if (step === "form" && !isDirectForm) {
      actions.setCloseInterceptor?.(() => {
        setStep("select");
        setSelectedKind(null);
        return false;
      });
    } else {
      actions.setCloseInterceptor?.(null);
    }
    return () => {
      actions.setCloseInterceptor?.(null);
    };
  }, [step, isDirectForm, actions]);

  const handleSelect = (kind: IntegrationKind) => {
    setSelectedKind(kind);
    setStep("form");
  };

  const handleBack = () => {
    setStep("select");
    setSelectedKind(null);
  };
  const handleFormBack = isDirectForm ? actions.closeModal : handleBack;

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
    let headerLabel = tCommon("action.previous");
    if (isDirectForm) {
      HeaderIcon = IconX;
      headerLabel = tCommon("action.close");
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

  if (isIntegrationDataError) {
    return (
      <Alert color="red" title={tCommon("error")}>
        <Stack gap="sm">
          <Text size="sm">{tIntegration("grid.loadError")}</Text>
          <Button variant="light" color="red" onClick={() => void refetch()}>
            {tCommon("action.tryAgain")}
          </Button>
        </Stack>
      </Alert>
    );
  }

  return (
    <IntegrationSelectGrid
      onSelect={handleSelect}
      enableMockIntegration={innerProps.enableMockIntegration}
      allowedKinds={innerProps.allowedKinds}
      integrationData={integrationData}
    />
  );
}).withOptions({
  defaultTitle: (t) => t("integration.action.create"),
  size: modalSizeSelect,
});
