"use client";

import React from "react";
import {
  Box,
  Center,
  LoadingOverlay,
  Overlay,
  Stack,
  Text,
  ThemeIcon,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { useDisclosure, useTimeout } from "@mantine/hooks";
import { IconAutomation, IconCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";
import { zoomCompensatedSize } from "@homarr/ui";

import type { WidgetComponentProps } from "../../definition";
import { isSmartHomeTiny } from "../layout";

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
  const { start } = useTimeout(() => {
    closeSuccess();
  }, 1000);

  const { mutateAsync, isPending, error } = clientApi.widget.smartHome.executeAutomation.useMutation({
    onSuccess: () => {
      setLastExecutedAt(new Date());
      showSuccess();
      start();
    },
  });
  const handleClick = React.useCallback(async () => {
    if (isEditMode || isPending || !integrationId || !canInteract) {
      return;
    }
    try {
      await mutateAsync({
        automationId: options.automationId,
        integrationId,
      });
    } catch {
      // The mutation exposes the error below and remains retryable.
    }
  }, [canInteract, integrationId, isEditMode, isPending, mutateAsync, options.automationId]);

  const t = useI18n("widget.smartHome-executeAutomation");
  const locale = useCurrentIntlLocale();
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
            // eslint-disable-next-line no-restricted-syntax
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

  const isTiny = isSmartHomeTiny(width, height);

  return (
    <Box pos="relative" w="100%" h="100%">
      <VisuallyHidden component="output">
        {isPending ? t("status.running") : isShowSuccess ? t("status.success") : ""}
      </VisuallyHidden>
      {error && <VisuallyHidden role="alert">{t("error.executeFailed")}</VisuallyHidden>}
      <UnstyledButton
        onClick={handleClick}
        disabled={!integrationId || !canInteract || isPending}
        aria-label={t("spotlightAction.run", { name: options.displayName })}
        style={{
          cursor: !isEditMode && integrationId && canInteract ? "pointer" : "initial",
          pointerEvents: isEditMode ? "none" : undefined,
        }}
        aria-description={error ? t("error.executeFailed") : undefined}
        w="100%"
        h="100%"
      >
        {isShowSuccess && (
          <Overlay>
            <Center w="100%" h="100%">
              <ThemeIcon variant="filled" color="green" size="xl" radius="xl">
                <IconCheck style={{ width: "70%", height: "70%" }} stroke={1.5} />
              </ThemeIcon>
            </Center>
          </Overlay>
        )}
        <LoadingOverlay visible={isPending} />
        {error && displayMode !== "advanced" && (
          <Overlay>
            <Center w="100%" h="100%" p="xs">
              <Text size="xs" c="red" ta="center" lineClamp={3}>
                {t("error.executeFailed")}
              </Text>
            </Center>
          </Overlay>
        )}
        <Center w="100%" h="100%">
          <Stack align="center" gap={isTiny ? 6 : "md"} p="xs" maw="100%">
            <ThemeIcon variant="light" size={isTiny ? "md" : "xl"} radius="xl">
              <IconAutomation style={zoomCompensatedSize(isTiny ? 14 : 24)} />
            </ThemeIcon>
            <Text ta="center" fw={600} fz={isTiny ? "xs" : "sm"} lineClamp={2} maw="100%">
              {options.displayName}
            </Text>
            {displayMode === "advanced" && (
              <Stack gap={2} align="center">
                <Text ta="center" size="xs" c="dimmed">
                  {t("advanced.automationId", { id: options.automationId })}
                </Text>
                <Text ta="center" size="xs" c={canInteract ? "dimmed" : "orange"}>
                  {t(canInteract ? "advanced.ready" : "advanced.noPermission")}
                </Text>
                {lastExecutedAt && (
                  <Text ta="center" size="xs" c="dimmed">
                    {t("advanced.lastExecuted", {
                      time: lastExecutedAt.toLocaleTimeString(locale),
                    })}
                  </Text>
                )}
                {error && (
                  <Text ta="center" size="xs" c="red">
                    {t("error.executeFailed")}
                  </Text>
                )}
              </Stack>
            )}
          </Stack>
        </Center>
      </UnstyledButton>
    </Box>
  );
}
