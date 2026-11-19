"use client";

import { ActionIcon, Group, Select } from "@mantine/core";
import { IconAdjustments, IconPower, IconVolume, IconVolumeOff } from "@tabler/icons-react";

import { supportsSmartHomeAction } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import type { HaAction, HaEntity } from "./types";
import { useDeviceControlDisabled, useEntityDetailOpener, useRunner } from "./control-center/hooks";
import { smartHomeActionIconVars } from "./control-center/theme";

export function MediaActions({ entity, compact = false }: { entity: HaEntity; compact?: boolean }) {
  const t = useI18n("widget.smartHome-controls.media");
  const { run, pending } = useRunner(entity);
  const open = useEntityDetailOpener(entity.id);
  const unavailable = ["unknown", "unavailable"].includes(entity.state);
  const disabled = useDeviceControlDisabled(unavailable);
  const off = entity.state === "off";
  let power: HaAction = { type: "turnOff" };
  let powerLabel = t("turnOff", { name: entity.name });
  if (off) {
    power = { type: "turnOn" };
    powerLabel = t("turnOn", { name: entity.name });
  }
  const sources = [...new Set(entity.attributes.sources ?? [])].filter((source) => source.trim().length > 0);
  const canSelectSource = sources.some((value) => supportsSmartHomeAction(entity, { type: "selectSource", value }));
  let muteLabel = t("mute", { name: entity.name });
  let MuteIcon = IconVolume;
  if (entity.attributes.isMuted) {
    muteLabel = t("unmute", { name: entity.name });
    MuteIcon = IconVolumeOff;
  }

  if (compact) {
    if (!open) return null;
    return (
      <ActionIcon
        vars={smartHomeActionIconVars}
        variant="subtle"
        color="gray"
        aria-label={t("controls", { name: entity.name })}
        onClick={open}
      >
        <IconAdjustments size={20} />
      </ActionIcon>
    );
  }

  return (
    <Group gap={8} w="100%" wrap="wrap">
      {supportsSmartHomeAction(entity, power) && (
        <ActionIcon
          vars={smartHomeActionIconVars}
          variant="default"
          aria-label={powerLabel}
          title={powerLabel}
          disabled={disabled || pending}
          onClick={() => void run(power)}
        >
          <IconPower size={20} />
        </ActionIcon>
      )}
      {supportsSmartHomeAction(entity, { type: "setMuted", value: true }) && (
        <ActionIcon
          vars={smartHomeActionIconVars}
          variant="default"
          aria-label={muteLabel}
          title={muteLabel}
          aria-pressed={entity.attributes.isMuted ?? false}
          disabled={disabled || off || pending}
          onClick={() => void run({ type: "setMuted", value: !entity.attributes.isMuted })}
        >
          <MuteIcon size={20} />
        </ActionIcon>
      )}
      {canSelectSource && (
        <Select
          aria-label={t("input", { name: entity.name })}
          placeholder={t("inputPlaceholder")}
          data={sources}
          value={entity.attributes.mediaSource ?? null}
          allowDeselect={false}
          disabled={disabled || off || pending}
          miw={100}
          flex={1}
          size="md"
          styles={{ input: { textOverflow: "ellipsis" } }}
          onChange={(value) => {
            if (value !== null) void run({ type: "selectSource", value });
          }}
        />
      )}
    </Group>
  );
}
