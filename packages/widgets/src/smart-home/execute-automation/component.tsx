import React from "react";
import { ActionIcon, Center, LoadingOverlay, Overlay, Stack, Text, UnstyledButton } from "@mantine/core";
import { useDisclosure, useTimeout } from "@mantine/hooks";
import { IconAutomation, IconCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../../definition";

export default function SmartHomeTriggerAutomationWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"smartHome-executeAutomation">) {
  const [isShowSuccess, { open: showSuccess, close: closeSuccess }] = useDisclosure();
  const { start } = useTimeout(() => {
    closeSuccess();
  }, 1000);

  const { mutateAsync, isPending } = clientApi.widget.smartHome.executeAutomation.useMutation({
    onSuccess: () => {
      showSuccess();
      start();
    },
  });
  const handleClick = React.useCallback(async () => {
    if (isEditMode) {
      return;
    }
    await mutateAsync({
      automationId: options.automationId,
      integrationId: integrationIds[0] ?? "",
    });
  }, [integrationIds, isEditMode, mutateAsync, options.automationId]);
  return (
    <UnstyledButton onClick={handleClick} style={{ cursor: !isEditMode ? "pointer" : "initial" }} w="100%" h="100%">
      {isShowSuccess && (
        <Overlay>
          <Center w="100%" h="100%">
            <ActionIcon variant="filled" color="green" size="xl" radius="xl">
              <IconCheck style={{ width: "70%", height: "70%" }} stroke={1.5} />
            </ActionIcon>
          </Center>
        </Overlay>
      )}
      <LoadingOverlay visible={isPending} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Center w="100%" h="100%">
        <Stack align="center" gap="md">
          <IconAutomation />
          <Text fw="bold">{options.displayName}</Text>
        </Stack>
      </Center>
    </UnstyledButton>
  );
}
