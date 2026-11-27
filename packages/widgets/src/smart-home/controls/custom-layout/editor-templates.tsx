"use client";

import { useState } from "react";
import { ActionIcon, Button, Group, Popover, Select, Stack, Text } from "@mantine/core";
import { IconTemplate, IconTrash } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import { smartHomeLayoutPresets } from "./presets";
import type { SmartHomeLayoutPreset } from "./presets";
import type { SmartHomeLayoutTemplate } from "./schema";

interface TemplateMenuProps {
  devices: { value: string; label: string }[];
  device: string | null;
  onDeviceChange: (device: string | null) => void;
  disabled: boolean;
  devicesDisabled: boolean;
  templates: readonly SmartHomeLayoutTemplate[];
  onAddPreset: (preset: SmartHomeLayoutPreset) => void;
  onAddTemplate: (template: SmartHomeLayoutTemplate) => void;
  onRemoveTemplate: (id: string) => void;
}

/** A device and what to build from it (a preset or an own template), in one place: the toolbar keeps a single row. */
export function TemplateMenu({
  devices,
  device,
  onDeviceChange,
  disabled,
  devicesDisabled,
  templates,
  onAddPreset,
  onAddTemplate,
  onRemoveTemplate,
}: TemplateMenuProps) {
  const t = useI18n("widget.smartHome-controls.layout.editor");
  const [templateOpened, setTemplateOpened] = useState(false);
  return (
    <Popover
      opened={templateOpened}
      onChange={setTemplateOpened}
      position="bottom-start"
      width={300}
      shadow="md"
      trapFocus
      returnFocus
    >
      <Popover.Target>
        <Button
          size="sm"
          variant="default"
          leftSection={<IconTemplate size={16} />}
          disabled={disabled}
          onClick={() => setTemplateOpened((opened) => !opened)}
        >
          {t("addTemplate")}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Select
            size="sm"
            data-autofocus
            label={t("templateDevice")}
            placeholder={t("templateDevice")}
            data={devices}
            value={device}
            onChange={onDeviceChange}
            searchable
            clearable
            disabled={devicesDisabled}
            // In the popover's own layer, so picking a device does not count as a click outside it.
            comboboxProps={{ withinPortal: false }}
          />
          {smartHomeLayoutPresets.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant="light"
              justify="flex-start"
              disabled={!device}
              onClick={() => {
                onAddPreset(preset);
                setTemplateOpened(false);
              }}
            >
              {t(`preset.${preset}`)}
            </Button>
          ))}
          {templates.length > 0 && (
            <>
              <Text size="xs" fw={500} c="dimmed" mt={4}>
                {t("myTemplates")}
              </Text>
              {templates.map((template) => (
                <Group key={template.id} gap={4} wrap="nowrap">
                  <Button
                    flex={1}
                    size="sm"
                    variant="light"
                    justify="flex-start"
                    disabled={!device}
                    onClick={() => {
                      onAddTemplate(template);
                      setTemplateOpened(false);
                    }}
                  >
                    {template.name}
                  </Button>
                  <ActionIcon
                    size="input-sm"
                    variant="subtle"
                    color="red"
                    aria-label={t("deleteTemplate", { name: template.name })}
                    onClick={() => onRemoveTemplate(template.id)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </>
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
