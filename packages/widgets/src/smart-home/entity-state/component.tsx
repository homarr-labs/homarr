"use client";

import { useCallback } from "react";
import { Badge, Center, Group, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBinaryTree } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useCurrentLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";

export default function SmartHomeEntityStateWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"smartHome-entityState">) {
  const t = useI18n();
  const locale = useCurrentLocale();
  // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const integrationId = integrationIds[0]!;

  const input = {
    entityId: options.entityId,
    integrationId,
  };
  const { data: entity } = clientApi.widget.smartHome.entityDetails.useQuery(input);
  const canInteract = useIntegrationsWithInteractAccess().some(({ id }) => id === integrationId);

  const utils = clientApi.useUtils();
  const { mutate, isPending, error } = clientApi.widget.smartHome.switchEntity.useMutation({
    onSettled: () => void utils.widget.smartHome.entityDetails.invalidate(input),
  });

  const apiUnit = entity?.attributes.unit_of_measurement;
  const unit = options.entityUnit || (typeof apiUnit === "string" ? apiUnit : "");
  const attribute = unit.length > 0 ? ` ${unit}` : "";
  const isActionable = options.clickable && canInteract && !isPending;

  const handleClick = useCallback(() => {
    if (isEditMode) {
      return;
    }

    if (!isActionable) {
      return;
    }

    mutate({
      entityId: options.entityId,
      integrationId,
    });
  }, [integrationId, isActionable, isEditMode, mutate, options.entityId]);

  useRegisterSpotlightContextActions(
    `smartHome-entityState-${options.entityId}`,
    [
      {
        id: options.entityId,
        name: options.displayName,
        icon: IconBinaryTree,
        interaction() {
          return {
            type: "javaScript",
            onSelect() {
              handleClick();
            },
          };
        },
        disabled: !isActionable,
      },
    ],
    [handleClick, isActionable, options.displayName, options.entityId],
  );
  const isTiny = width < 128 || height < 96;
  const advancedAttributes = [
    { key: "unit" as const, value: entity?.attributes.unit_of_measurement },
    { key: "deviceClass" as const, value: entity?.attributes.device_class },
    { key: "icon" as const, value: entity?.attributes.icon },
  ].filter(({ value }) => typeof value === "string" && value.length > 0);

  return (
    <UnstyledButton
      mod={{ "entity-state": entity?.state, "entity-id": options.entityId }}
      onClick={handleClick}
      disabled={!isActionable}
      aria-description={error?.message}
      w="100%"
      h="100%"
      styles={{
        root: {
          cursor: isActionable && !isEditMode ? "pointer" : "initial",
          pointerEvents: isEditMode ? "none" : undefined,
        },
      }}
    >
      <Center h="100%" w="100%">
        <Stack align="center" gap={isTiny ? 4 : "md"} p="xs" maw="100%">
          <Text ta="center" fw="bold" size={isTiny ? "sm" : "lg"}>
            {displayMode === "advanced" && typeof entity?.attributes.friendly_name === "string"
              ? entity.attributes.friendly_name
              : options.displayName}
          </Text>
          <Text ta="center" size={isTiny ? "xs" : "lg"}>
            {entity?.state ?? "—"}
            {attribute}
          </Text>
          {displayMode === "advanced" && entity && (
            <>
              <Group justify="center" gap={4}>
                {advancedAttributes.map(({ key, value }) => (
                  <Badge key={key} size="xs" variant="light" tt="none">
                    {t(`widget.smartHome-entityState.advanced.attribute.${key}`)}: {String(value)}
                  </Badge>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                {t("widget.smartHome-entityState.advanced.entityId", { id: entity.entity_id })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("widget.smartHome-entityState.advanced.lastUpdated", {
                  date: new Date(entity.last_updated).toLocaleString(locale),
                })}
              </Text>
            </>
          )}
          {error && (
            <Tooltip label={error.message} multiline>
              <Text size="xs" c="red" lineClamp={2}>
                {t("widget.smartHome-entityState.error.toggleFailed")}
              </Text>
            </Tooltip>
          )}
        </Stack>
      </Center>
    </UnstyledButton>
  );
}
