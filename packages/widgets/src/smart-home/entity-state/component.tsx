"use client";

import { useCallback } from "react";
import { Center, Stack, Text, UnstyledButton } from "@mantine/core";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../../definition";
import { NoIntegrationSelectedError } from "../../errors";

export default function SmartHomeEntityStateWidget({
  options,
  integrationIds,
  isEditMode,
}: WidgetComponentProps<"smartHome-entityState">) {
  const integrationId = integrationIds[0];

  if (!integrationId) {
    throw new NoIntegrationSelectedError();
  }

  return <InnerComponent options={options} integrationId={integrationId} isEditMode={isEditMode} />;
}

type InnerComponentProps = Pick<WidgetComponentProps<"smartHome-entityState">, "options" | "isEditMode"> & {
  integrationId: string;
};

const InnerComponent = ({ options, integrationId, isEditMode }: InnerComponentProps) => {
  const input = {
    entityId: options.entityId,
    integrationId,
  };
  const [entityState] = clientApi.widget.smartHome.entityState.useSuspenseQuery(input);

  const utils = clientApi.useUtils();

  clientApi.widget.smartHome.subscribeEntityState.useSubscription(
    {
      entityId: options.entityId,
    },
    {
      onData(data) {
        utils.widget.smartHome.entityState.setData(input, data.state);
      },
    },
  );

  const { mutate } = clientApi.widget.smartHome.switchEntity.useMutation();

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
      integrationId,
    });
  }, [integrationId, isEditMode, mutate, options.clickable, options.entityId]);

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
            {entityState}
            {attribute}
          </Text>
        </Stack>
      </Center>
    </UnstyledButton>
  );
};
