"use client";

import { useState } from "react";
import { Button, ColorInput, Group, Slider, Stack } from "@mantine/core";

import { getLightCapabilities } from "@homarr/integrations/types";

import type { HaEntity } from "../../types";
import { useDeviceControlDisabled, useRunner } from "./hooks";
import classes from "./styles.module.css";

const colors = [
  { color: "#ff5a45", label: "Red" },
  { color: "#50ce81", label: "Green" },
  { color: "#648cff", label: "Blue" },
  { color: "#c478ff", label: "Purple" },
];

const parseHex = (value: string): [number, number, number] | null => {
  if (!/^#[\da-f]{6}$/i.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ];
};

const toHex = (rgb: [number, number, number] | undefined) => {
  if (!rgb) return "";
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
};

const getWhitePresets = (entity: HaEntity) => {
  const min = entity.attributes.minColorTempKelvin ?? 2000;
  const max = entity.attributes.maxColorTempKelvin ?? 6535;
  return [
    { kelvin: min, color: "#ffb35c", label: "Warm" },
    { kelvin: Math.round((min + max) / 2), color: "#ffe6bd", label: "Neutral" },
    { kelvin: max, color: "#cfe4ff", label: "Cool" },
  ];
};

export function LightColorPresets({ entity, compact = false }: { entity: HaEntity; compact?: boolean }) {
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(
    entity.readOnly || entity.state === "unavailable" || entity.state === "unknown" || pending,
  );
  const capabilities = getLightCapabilities(entity.attributes);
  if (!capabilities.color && !capabilities.colorTemperature) return null;
  return (
    <Group gap={12} aria-label={`${entity.name} colour presets`}>
      {capabilities.color &&
        colors.slice(0, compact ? 3 : colors.length).map(({ color, label }) => (
          <button
            key={color}
            type="button"
            className={classes.swatch}
            style={{ background: color }}
            aria-label={`${entity.name} ${label.toLowerCase()}`}
            disabled={disabled}
            onClick={() => {
              const value = parseHex(color);
              if (value && !disabled) void run({ type: "setRgbColor", value });
            }}
          />
        ))}
      {capabilities.colorTemperature &&
        (!compact || !capabilities.color) &&
        getWhitePresets(entity).map(({ kelvin, color, label }) => (
          <button
            key={label}
            type="button"
            className={classes.swatch}
            style={{ background: color }}
            aria-label={`${entity.name} ${label.toLowerCase()} white ${kelvin} kelvin`}
            disabled={disabled}
            onClick={() => {
              if (!disabled) void run({ type: "setColorTemp", value: kelvin });
            }}
          />
        ))}
    </Group>
  );
}

function RgbControl({ entity }: { entity: HaEntity }) {
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(
    entity.readOnly || pending || entity.state === "unavailable" || entity.state === "unknown",
  );
  const actual = toHex(entity.attributes.rgbColor);
  const key = `${entity.id}:${actual}:${entity.attributes.colorMode ?? ""}`;
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const value = draft?.key === key ? draft.value : actual;
  const rgb = parseHex(value);
  const changed = value !== actual || entity.attributes.colorMode === "color_temp" || entity.state === "off";
  const commit = () => {
    if (!rgb || !changed || disabled) return;
    setDraft(null);
    void run({ type: "setRgbColor", value: rgb });
  };
  return (
    <Group align="end" gap="xs">
      <ColorInput
        label="Colour"
        aria-label={`${entity.name} colour`}
        placeholder="Choose a colour"
        format="hex"
        value={value}
        onChange={(next) => setDraft({ key, value: next })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
        disabled={disabled}
        withEyeDropper={false}
        swatches={colors.map(({ color }) => color)}
        popoverProps={{ withinPortal: false }}
        flex={1}
        miw={120}
      />
      <Button
        variant="light"
        disabled={disabled || !rgb || !changed}
        aria-label={`Apply ${entity.name} colour`}
        onClick={commit}
      >
        Apply
      </Button>
    </Group>
  );
}

function WhiteTemperatureControl({ entity }: { entity: HaEntity }) {
  const { run, pending } = useRunner(entity);
  const disabled = useDeviceControlDisabled(
    entity.readOnly || pending || entity.state === "unavailable" || entity.state === "unknown",
  );
  const attributes = entity.attributes;
  const min = attributes.minColorTempKelvin ?? 2000;
  const max = attributes.maxColorTempKelvin ?? 6535;
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? attributes.colorTempKelvin ?? Math.round((min + max) / 2);
  return (
    <Stack gap="xs">
      <span>
        {draft !== null || attributes.colorTempKelvin !== undefined
          ? `White temperature · ${value} K`
          : "Choose white temperature"}
      </span>
      <Slider
        thumbLabel={`${entity.name} white temperature`}
        thumbValueText={(kelvin) => `${kelvin} kelvin`}
        min={min}
        max={max}
        step={1}
        color="orange"
        value={value}
        disabled={disabled || min >= max}
        onChange={setDraft}
        onChangeEnd={(next) => {
          setDraft(null);
          if (!disabled) void run({ type: "setColorTemp", value: next });
        }}
      />
    </Stack>
  );
}

export function LightColorControls({ entity }: { entity: HaEntity }) {
  if (entity.domain !== "light") return null;
  const capabilities = getLightCapabilities(entity.attributes);
  if (!capabilities.color && !capabilities.colorTemperature) return null;
  return (
    <Stack gap="md" data-gesture>
      {capabilities.color && <RgbControl key={entity.id} entity={entity} />}
      {capabilities.colorTemperature && <WhiteTemperatureControl key={entity.id} entity={entity} />}
      <LightColorPresets entity={entity} />
    </Stack>
  );
}
