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
  Tooltip,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { useDisclosure, useTimeout } from "@mantine/hooks";
import { IconAutomation, IconCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";

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

  const t = useI18n();
  useRegisterSpotlightContextActions(
    `smartHome-automation-${options.automationId}`,
    [
      {
        id: options.automationId,
        name: t("widget.smartHome-executeAutomation.spotlightAction.run", { name: options.displayName }),
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

  const isTiny = width < 128 || height < 96;

  return (
    <Box pos="relative" w="100%" h="100%">
      <VisuallyHidden role="status">
        {isPending
          ? t("widget.smartHome-executeAutomation.status.running")
          : isShowSuccess
            ? t("widget.smartHome-executeAutomation.status.success")
            : ""}
      </VisuallyHidden>
      {error && (
        <VisuallyHidden role="alert">{t("widget.smartHome-executeAutomation.error.executeFailed")}</VisuallyHidden>
      )}
      <UnstyledButton
        onClick={handleClick}
        disabled={!integrationId || !canInteract || isPending}
        style={{
          cursor: !isEditMode && integrationId && canInteract ? "pointer" : "initial",
          pointerEvents: isEditMode ? "none" : undefined,
        }}
        aria-description={error?.message}
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
              <Tooltip label={error.message} multiline>
                <Text size="xs" c="red" ta="center" lineClamp={3}>
                  {t("widget.smartHome-executeAutomation.error.executeFailed")}
                </Text>
              </Tooltip>
            </Center>
          </Overlay>
        )}
        <Center w="100%" h="100%">
          <Stack align="center" gap="md">
            <IconAutomation size={isTiny ? 16 : undefined} />
            <Text ta="center" fw="bold" fz={isTiny ? "xs" : undefined}>
              {options.displayName}
            </Text>
            {displayMode === "advanced" && (
              <>
                {error ? (
                  <Tooltip label={error.message} multiline>
                    <Text ta="center" size="xs" c="red">
                      {t("widget.smartHome-executeAutomation.error.executeFailed")}
                    </Text>
                  </Tooltip>
                ) : (
                  <Text ta="center" size="xs" c="dimmed">
                    {lastExecutedAt
                      ? t("widget.smartHome-executeAutomation.advanced.lastExecuted", {
                          time: lastExecutedAt.toLocaleTimeString(),
                        })
                      : t("widget.smartHome-executeAutomation.advanced.automationId", {
                          id: options.automationId,
                        })}
                  </Text>
                )}
              </>
            )}
          </Stack>
        </Center>
      </UnstyledButton>
    </Box>
  );
}
