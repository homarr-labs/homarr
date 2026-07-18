"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Card,
  Combobox,
  Group,
  InputBase,
  Loader,
  Paper,
  Stack,
  Text,
  useCombobox,
} from "@mantine/core";
import { IconApi } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useOptionalBoard } from "@homarr/boards/context";
import { useScopedI18n } from "@homarr/translation/client";

import type { CommonWidgetInputProps } from "./common";
import { useWidgetInputTranslation } from "./common";
import { useFormContext } from "./form";

const CustomJsxDisplay = dynamic(() => import("../custom-api/custom-jsx-display"), { ssr: false });

export const WidgetCustomWidgetSelectInput = ({
  property,
  kind,
  options,
}: CommonWidgetInputProps<"customWidgetSelect">) => {
  const t = useWidgetInputTranslation(kind, property);
  const labels = useScopedI18n("widget.customApi.picker");
  const form = useFormContext();
  const board = useOptionalBoard();
  const currentValue = form.values.options[property] as string;
  const { data, isLoading } = clientApi.customWidget.available.useQuery(
    { boardId: board?.id ?? "", currentId: currentValue || undefined },
    { enabled: board !== null },
  );
  const [search, setSearch] = useState("");

  const definitions = useMemo(
    () => (data ?? []).map((definition) => ({ ...definition, value: definition.id, label: definition.name })),
    [data],
  );

  const filteredOptions = useMemo(
    () =>
      definitions.filter(
        (def) =>
          def.label.toLowerCase().includes(search.toLowerCase()) ||
          def.value.toLowerCase().includes(search.toLowerCase()),
      ),
    [definitions, search],
  );

  const selectedLabel = definitions.find((d) => d.value === currentValue)?.label;
  const selected = definitions.find((definition) => definition.value === currentValue);

  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  return (
    <Stack gap="sm">
      <Combobox
        store={combobox}
        onOptionSubmit={(val) => {
          const definition = definitions.find((candidate) => candidate.value === val);
          form.setFieldValue(`options.${property}`, val);
          form.setFieldValue("options.configuration", definition?.defaultOptions ?? {});
          form.setFieldValue(
            "options.configurationVersion",
            definition?.updatedAt instanceof Date ? definition.updatedAt.getTime() : Date.now(),
          );
          combobox.closeDropdown();
        }}
      >
        <Combobox.Target>
          <InputBase
            label={t("label")}
            description={options.withDescription ? t("description") : undefined}
            rightSection={isLoading ? <Loader size="xs" /> : <Combobox.Chevron />}
            rightSectionPointerEvents="none"
            value={combobox.dropdownOpened ? search : (selectedLabel ?? currentValue)}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              combobox.openDropdown();
              combobox.updateSelectedOptionIndex();
            }}
            onClick={() => combobox.openDropdown()}
            onFocus={() => combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
            placeholder={t("label")}
          />
        </Combobox.Target>

        <Combobox.Dropdown>
          <Combobox.Options>
            <Combobox.Group label={labels("group")}>
              {filteredOptions.map((def) => (
                <Combobox.Option key={def.value} value={def.value} active={def.value === currentValue}>
                  <Group wrap="nowrap" gap="sm">
                    <Avatar src={def.iconUrl} size={36} radius="md" color="blue">
                      <IconApi size={18} />
                    </Avatar>
                    <Stack gap={1} style={{ minWidth: 0 }}>
                      <Text size="sm" fw={600} truncate>
                        {def.label}
                      </Text>
                      {def.description && (
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {def.description}
                        </Text>
                      )}
                      <Group gap={4} mt={2}>
                        <Badge size="xs" variant="light">
                          {labels("sources", { count: def.sources.length })}
                        </Badge>
                        <Badge size="xs" variant="light" color="gray">
                          {labels("requests", { count: def.requestCapabilities.length })}
                        </Badge>
                      </Group>
                    </Stack>
                  </Group>
                </Combobox.Option>
              ))}
            </Combobox.Group>
            {filteredOptions.length === 0 && !isLoading && <Combobox.Empty>{labels("empty")}</Combobox.Empty>}
          </Combobox.Options>
        </Combobox.Dropdown>
      </Combobox>
      {selected && (
        <Card withBorder p="sm">
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                {selected.name}
              </Text>
              <Badge size="sm" variant="light">
                {labels("preview")}
              </Badge>
            </Group>
            <Paper withBorder p="sm" h={180} style={{ overflow: "auto" }}>
              <CustomJsxDisplay
                data={{
                  template: selected.template,
                  data: {},
                  status: Object.fromEntries(
                    selected.requestCapabilities.map((request) => [request.id, { loading: true }]),
                  ),
                  options: selected.defaultOptions,
                  stateSchema: selected.stateSchema,
                  defaultState: selected.defaultState,
                  requestCapabilities: selected.requestCapabilities,
                  previewSessionId: "widget-picker",
                  queriesDisabled: true,
                  isEditMode: true,
                }}
              />
            </Paper>
          </Stack>
        </Card>
      )}
    </Stack>
  );
};
