import {
  Avatar,
  CheckIcon,
  CloseButton,
  Combobox,
  Group,
  Pill,
  PillsInput,
  ScrollArea,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";

import type { EditorIntegration, EditorTranslate, WidgetEditorDomain } from "./contracts";

export function WidgetIntegrationSelect(props: {
  value: string[];
  data: readonly EditorIntegration[];
  onChange(value: string[]): void;
  multiple: boolean;
  required: boolean;
  disabled: boolean;
  error?: string;
  domain: WidgetEditorDomain;
  t: EditorTranslate;
}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: () => combobox.updateSelectedOptionIndex("active"),
  });
  const remove = (id: string) => props.onChange(props.value.filter((value) => value !== id));
  return (
    <Combobox
      store={combobox}
      onOptionSubmit={(id) => {
        if (props.disabled) return;
        if (props.value.includes(id)) remove(id);
        else props.onChange(props.multiple ? [...props.value, id] : [id]);
        if (!props.multiple) combobox.closeDropdown();
      }}
    >
      <Combobox.DropdownTarget>
        <PillsInput
          label={props.t("item.edit.field.integrations.label")}
          withAsterisk={props.required}
          error={props.error}
          disabled={props.disabled}
          pointer
          onClick={() => !props.disabled && combobox.openDropdown()}
        >
          <Pill.Group>
            {props.value.map((id) => {
              const integration = props.data.find((candidate) => candidate.id === id);
              return (
                <Pill key={id}>
                  <Group gap={4} wrap="nowrap">
                    {integration && <Avatar src={props.domain.getIconUrl(integration.kind)} size={14} />}
                    <Text span size="xs">
                      {integration?.name ?? id}
                    </Text>
                    {props.multiple && (
                      <CloseButton
                        disabled={props.disabled}
                        size={20}
                        aria-label={props.t("item.edit.field.integrations.removeLabel", {
                          name: integration?.name ?? id,
                        })}
                        onClick={(event) => {
                          event.stopPropagation();
                          remove(id);
                        }}
                      />
                    )}
                  </Group>
                </Pill>
              );
            })}
            <Combobox.EventsTarget>
              <PillsInput.Field
                readOnly
                disabled={props.disabled}
                aria-label={props.t("item.edit.field.integrations.label")}
                placeholder={props.value.length === 0 ? props.t("common.multiSelect.placeholder") : undefined}
                onFocus={() => !props.disabled && combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
                onKeyDown={(event) => {
                  if (props.disabled) return;
                  if (["ArrowDown", "Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    combobox.openDropdown();
                  } else if (event.key === "Escape") combobox.closeDropdown();
                  else if (event.key === "Backspace" && props.multiple) {
                    const last = props.value.at(-1);
                    if (last) {
                      event.preventDefault();
                      remove(last);
                    }
                  }
                }}
              />
            </Combobox.EventsTarget>
          </Pill.Group>
        </PillsInput>
      </Combobox.DropdownTarget>
      <Combobox.Dropdown>
        <ScrollArea.Autosize mah="min(320px, 45dvh)" type="auto" scrollbars="y">
          <Combobox.Options>
            {props.data.map((integration) => (
              <Combobox.Option
                key={integration.id}
                value={integration.id}
                active={props.value.includes(integration.id)}
              >
                <Group gap="sm" wrap="nowrap">
                  {props.value.includes(integration.id) && <CheckIcon size="var(--mantine-font-size-xs)" />}
                  <Avatar src={props.domain.getIconUrl(integration.kind)} size="sm" />
                  <Stack gap={0}>
                    <Text size="sm">{integration.name}</Text>
                    <Text size="xs" c="dimmed">
                      {integration.url}
                    </Text>
                  </Stack>
                </Group>
              </Combobox.Option>
            ))}
            {props.data.length === 0 && <Combobox.Empty>{props.t("widget.common.integration.noData")}</Combobox.Empty>}
          </Combobox.Options>
        </ScrollArea.Autosize>
      </Combobox.Dropdown>
    </Combobox>
  );
}
