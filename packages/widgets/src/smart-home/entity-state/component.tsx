"use client";

import React, { useCallback, useState } from "react";
import { Center, Stack, Text, UnstyledButton } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../../definition";

export default function SmartHomeEntityStateWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"smartHome-entityState">) {
  const [lastState, setLastState] = useState<{
    entityId: string;
    state: string;
  }>();

  const utils = clientApi.useUtils();

  clientApi.widget.smartHome.subscribeEntityState.useSubscription(
    {
      entityId: options.entityId,
    },
    {
      onData(data) {
        setLastState(data);
      },
    },
  );

  const { mutate } = clientApi.widget.smartHome.switchEntity.useMutation({
    onSettled: () => {
      void utils.widget.smartHome.invalidate();
    },
  });

  const attribute = options.entityUnit.length > 0 ? " " + options.entityUnit : "";

  const handleClick = useCallback(() => {
    if (isEditMode) {
      return;
    }

    if (!options.clickable) {
      return;
    }

    mutate({
      entityId: options.entityId,
      integrationId: integrationIds[0] ?? "",
    });
  }, [integrationIds, isEditMode, mutate, options.clickable, options.entityId]);

  return (
    <UnstyledButton
      onClick={handleClick}
      w="100%"
      h="100%"
      styles={{ root: { cursor: options.clickable && !isEditMode ? "pointer" : "initial" } }}
    >
      <Center h="100%" w="100%">
        <Stack align="center" gap="md">
          <Text ta="center" fw="bold" size="lg">
            {options.displayName}
          </Text>
          <Text ta="center">
            {lastState?.state}
            {attribute}
          </Text>
        </Stack>
      </Center>
    </UnstyledButton>
  );
}
