"use client";

import React from "react";
import { useDisclosure, useTimeout } from "@mantine/hooks";
import { IconAutomation } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { SmartHomeAutomationView } from "./native-view";

export default function SmartHomeTriggerAutomationWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"smartHome-executeAutomation">) {
  const integrationId = integrationIds[0];
  const canInteract = useIntegrationsWithInteractAccess().some(({ id }) => id === integrationId);
  const [lastExecutedAt, setLastExecutedAt] = React.useState<Date | null>(null);
  const [isShowSuccess, { open: showSuccess, close: closeSuccess }] = useDisclosure();
  const utils = clientApi.useUtils();
  const { start } = useTimeout(() => closeSuccess(), 1000);
  const { mutateAsync, isPending, error } = clientApi.widget.smartHome.executeAutomation.useMutation({
    onSuccess: () => {
      void utils.widget.smartHome.entityDetails.invalidate();
      setLastExecutedAt(new Date());
      showSuccess();
      start();
    },
  });
  const handleClick = React.useCallback(async () => {
    if (isEditMode || isPending || !integrationId || !canInteract) return;
    try {
      await mutateAsync({ automationId: options.automationId, integrationId });
    } catch {
      return;
    }
  }, [canInteract, integrationId, isEditMode, isPending, mutateAsync, options.automationId]);
  const t = useI18n("widget.smartHome-executeAutomation");
  useRegisterSpotlightContextActions(
    `smartHome-automation-${options.automationId}`,
    [
      {
        id: options.automationId,
        name: t("spotlightAction.run", { name: options.displayName }),
        icon: IconAutomation,
        interaction() {
          return {
            type: "javaScript",
            async onSelect() {
              await handleClick();
            },
          };
        },
        disabled: !integrationId || !canInteract || isPending,
      },
    ],
    [canInteract, handleClick, integrationId, isPending, options.automationId, options.displayName],
  );
  return (
    <SmartHomeAutomationView
      options={options}
      integrationId={integrationId}
      canInteract={canInteract}
      isEditMode={isEditMode}
      width={width}
      height={height}
      displayMode={displayMode}
      lastExecutedAt={lastExecutedAt}
      isShowSuccess={isShowSuccess}
      isPending={isPending}
      error={Boolean(error)}
      handleClick={handleClick}
      zoomCompensatedSize={zoomCompensatedSize}
    />
  );
}
