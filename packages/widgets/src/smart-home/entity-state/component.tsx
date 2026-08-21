"use client";

import { useCallback } from "react";
import { Badge, Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconBinaryTree } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { showErrorNotification } from "@homarr/notifications";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";
import { isSmartHomeTiny } from "../layout";
import { getEntityStateLabel } from "./state";

export default function SmartHomeEntityStateWidget({
  options,
  integrationIds,
  isEditMode,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"smartHome-entityState">) {
  const t = useI18n("widget.smartHome-entityState");
  const tWidgetCommon = useI18n("widget.common");
  const tCommon = useI18n("common");
  const locale = useCurrentIntlLocale();
  // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const integrationId = integrationIds[0]!;

  const input = {
    entityId: options.entityId,
    integrationId,
  };
  const {
    data: entity,
    isPending: isEntityPending,
    error: entityError,
  } = clientApi.widget.smartHome.entityDetails.useQuery(input);
  const canInteract = useIntegrationsWithInteractAccess().some(({ id }) => id === integrationId);

  const utils = clientApi.useUtils();
  const { mutate, isPending } = clientApi.widget.smartHome.switchEntity.useMutation({
    onSettled: () => void utils.widget.smartHome.entityDetails.invalidate(input),
    onError: () =>
      showErrorNotification({
        title: tCommon("error"),
        message: t("error.toggleFailed"),
      }),
  });

  const apiUnit = entity?.attributes.unit_of_measurement;
  const unit = options.entityUnit || (typeof apiUnit === "string" ? apiUnit : "");
  const attribute = unit.length > 0 ? ` ${unit}` : "";
  const isActionable =
    !isEditMode &&
    options.clickable &&
    canInteract &&
    entity !== undefined &&
    !entityError &&
    !isEntityPending &&
    !isPending;
  const queryErrorLabel = entityError ? t("error.loadFailed") : undefined;

  const handleClick = useCallback(() => {
    if (!isActionable) {
      return;
    }

    mutate({
      entityId: options.entityId,
      integrationId,
    });
  }, [integrationId, isActionable, mutate, options.entityId]);

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

  if (entityError && entity === undefined) throw entityError;

  const isTiny = isSmartHomeTiny(width, height);
  const advancedAttributes = [
    { key: "unit" as const, value: entity?.attributes.unit_of_measurement },
    { key: "deviceClass" as const, value: entity?.attributes.device_class },
    { key: "icon" as const, value: entity?.attributes.icon },
  ].filter(({ value }) => typeof value === "string" && value.length > 0);
  const displayName =
    displayMode === "advanced" && typeof entity?.attributes.friendly_name === "string"
      ? entity.attributes.friendly_name
      : options.displayName;
  const knownStates = {
    on: t("state.on"),
    off: t("state.off"),
    unavailable: t("state.unavailable"),
    unknown: t("state.unknown"),
  };
  const state = getEntityStateLabel(entity?.state, knownStates);

  return (
    <UnstyledButton
      mod={{ "entity-state": entity?.state, "entity-id": options.entityId }}
      onClick={handleClick}
      disabled={!isActionable}
      aria-label={`${displayName}: ${state}${attribute}`}
      aria-description={queryErrorLabel}
      w="100%"
      h="100%"
      styles={{
        root: {
          cursor: isActionable ? "pointer" : "initial",
          pointerEvents: isEditMode ? "none" : undefined,
        },
      }}
    >
      <Center h="100%" w="100%">
        <Stack align="center" gap={isTiny ? 4 : "md"} p="xs" maw="100%">
          <Text ta="center" fw={700} size={isTiny ? "lg" : "2xl"} lh={1.1} lineClamp={1} maw="100%">
            {state}
            {attribute}
          </Text>
          <Text ta="center" c="dimmed" fw={500} size={isTiny ? "xs" : "sm"} lineClamp={2} maw="100%">
            {displayName}
          </Text>
          {queryErrorLabel && (
            <Text size="xs" c="orange" ta="center" lineClamp={1} maw="100%" aria-live="polite">
              {queryErrorLabel}
            </Text>
          )}
          {displayMode === "advanced" && entity && (
            <>
              <Group justify="center" gap={4}>
                {advancedAttributes.map(({ key, value }) => (
                  <Badge key={key} size="xs" variant="light" tt="none">
                    {t(`advanced.attribute.${key}`)}: {String(value)}
                  </Badge>
                ))}
              </Group>
              <Text size="xs" c="dimmed">
                {t("advanced.entityId", { id: entity.entity_id })}
              </Text>
              <Text size="xs" c="dimmed">
                {t("advanced.lastChanged", {
                  date: new Date(entity.last_changed).toLocaleString(locale),
                })}
              </Text>
              <Text size="xs" c="dimmed">
                {tWidgetCommon("updatedAt", {
                  date: new Date(entity.last_updated).toLocaleString(locale),
                })}
              </Text>
            </>
          )}
        </Stack>
      </Center>
    </UnstyledButton>
  );
}
