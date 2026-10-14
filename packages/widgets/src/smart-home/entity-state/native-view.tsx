"use client";

import { Badge, Center, Group, Stack, Text, UnstyledButton } from "@mantine/core";

import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { isSmartHomeTiny } from "../layout";
import { getEntityStateLabel } from "./state";

export interface SmartHomeEntityStateViewProps {
  options: { entityId: string; displayName: string; entityUnit: string };
  entity:
    | {
        attributes: Record<string, unknown>;
        entity_id: string;
        state: string;
        last_changed: Date;
        last_updated: Date;
      }
    | undefined;
  isEditMode: boolean;
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  isActionable: boolean;
  queryErrorLabel: string | undefined;
  handleClick: () => void;
}

export function SmartHomeEntityStateView({
  options,
  entity,
  isEditMode,
  width,
  height,
  displayMode,
  isActionable,
  queryErrorLabel,
  handleClick,
}: SmartHomeEntityStateViewProps) {
  const t = useI18n("widget.smartHome-entityState");
  const tWidgetCommon = useI18n("widget.common");
  const locale = useCurrentIntlLocale();

  const apiUnit = entity?.attributes.unit_of_measurement;
  const unit = options.entityUnit || (typeof apiUnit === "string" ? apiUnit : "");
  const attribute = unit.length > 0 ? ` ${unit}` : "";

  const isAdvanced = displayMode === "advanced";
  const isTiny = isAdvanced ? isSmartHomeTiny(width, height) : width < 128;
  const attributes: { key: "unit" | "deviceClass" | "icon"; value: unknown }[] = [
    { key: "unit", value: entity?.attributes.unit_of_measurement },
    { key: "deviceClass", value: entity?.attributes.device_class },
    { key: "icon", value: entity?.attributes.icon },
  ];
  const advancedAttributes = attributes.filter(({ value }) => typeof value === "string" && value.length > 0);
  const displayName =
    isAdvanced && typeof entity?.attributes.friendly_name === "string"
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
        <Stack align="center" gap={isAdvanced && isTiny ? 4 : "md"} p={isAdvanced ? "xs" : undefined} maw="100%">
          {isAdvanced ? (
            <>
              <Text ta="center" fw={700} size={isTiny ? "lg" : "2xl"} lh={1.1} lineClamp={1} maw="100%">
                {state}
                {attribute}
              </Text>
              <Text ta="center" c="dimmed" fw={500} size={isTiny ? "xs" : "sm"} lineClamp={2} maw="100%">
                {displayName}
              </Text>
            </>
          ) : (
            <>
              <Text ta="center" fw="bold" size={isTiny ? "sm" : "lg"} lineClamp={2} maw="100%">
                {displayName}
              </Text>
              <Text ta="center" size={isTiny ? "xs" : "lg"} lineClamp={1} maw="100%">
                {state}
                {attribute}
              </Text>
            </>
          )}
          {queryErrorLabel && (
            <Text size="xs" c="orange" ta="center" lineClamp={1} maw="100%" aria-live="polite">
              {queryErrorLabel}
            </Text>
          )}
          {isAdvanced && entity && (
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
