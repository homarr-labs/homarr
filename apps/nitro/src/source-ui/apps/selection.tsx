import type { ReactNode } from "react";
import {
  Button,
  Center,
  Group,
  Image,
  Input,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSearch } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/standalone/client";
import { selectGridCols, SelectableCard } from "@homarr/ui";

import type { AppDisplay } from "./contracts";

export interface SourceAppSelectionProps {
  search: string;
  onSearch: (search: string) => void;
  apps: readonly AppDisplay[];
  selectedIds: readonly string[];
  selectedCount: number;
  multiple: boolean;
  canCreate: boolean;
  readOnly: boolean;
  creating: boolean;
  pending: boolean;
  selectionUnavailable: boolean;
  form: ReactNode;
  feedback?: ReactNode;
  onCreate: () => void;
  onBack: () => void;
  onSelect: (app: AppDisplay) => void;
  onDiscard: () => void;
  onSubmit: () => void;
}

export function SourceAppSelection(props: SourceAppSelectionProps) {
  const t = useI18n();
  return (
    <Stack gap="md">
      {props.creating ? (
        <Stack>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={props.onBack}
            disabled={props.pending}
            style={{ alignSelf: "flex-start" }}
          >
            {t("app.action.select.backToApps")}
          </Button>
          {props.form}
        </Stack>
      ) : (
        <>
          <Stack gap={6}>
            <Input
              value={props.search}
              onChange={(event) => props.onSearch(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              placeholder={`${t("app.action.select.search")}...`}
              aria-label={t("app.action.select.search")}
              data-autofocus
              onKeyDown={(event) => {
                const app = props.apps[0];
                if (event.key === "Enter" && props.apps.length === 1 && app && !props.selectionUnavailable) {
                  event.preventDefault();
                  props.onSelect(app);
                }
              }}
            />
          </Stack>
          {props.feedback}
          <ScrollArea.Autosize mah="70vh" offsetScrollbars>
            <Stack gap="md" pt="xs" pr="xs" px={4}>
              <SimpleGrid cols={selectGridCols} spacing="sm">
                {props.canCreate && (
                  <SelectableCard
                    onClick={props.onCreate}
                    disabled={props.readOnly}
                    style={{ borderStyle: "dashed" }}
                    icon={
                      <ThemeIcon variant="light" color="primaryColor" size={34} radius="md">
                        <IconPlus size={20} />
                      </ThemeIcon>
                    }
                    title={t("app.action.create.title")}
                    description={t("app.action.create.description")}
                    footerLeft={
                      <Text size="xs" c="dimmed">
                        {t("app.action.select.customApplication")}
                      </Text>
                    }
                  />
                )}
                {props.apps.map((app) => (
                  <SourceAppSelectionCard
                    key={app.id}
                    app={app}
                    isSelected={props.selectedIds.includes(app.id)}
                    multiSelectActive={props.multiple}
                    disabled={props.selectionUnavailable}
                    onSelect={props.onSelect}
                  />
                ))}
              </SimpleGrid>
              {props.apps.length === 0 && !props.selectionUnavailable && (
                <Center p="xl">
                  <Text c="dimmed">{t("app.action.select.noResults")}</Text>
                </Center>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </>
      )}
      {props.multiple && (
        <Paper withBorder p="xs" radius="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              {t("app.action.select.appsSelected", { count: props.selectedCount })}
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                disabled={props.selectedCount === 0 || props.pending}
                onClick={props.onDiscard}
              >
                {t("common.action.discard")}
              </Button>
              <Button
                color="primaryColor"
                size="xs"
                disabled={props.selectedCount === 0 || props.creating || props.selectionUnavailable}
                onClick={props.onSubmit}
              >
                {t("common.action.add")} ({props.selectedCount})
              </Button>
            </Group>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

export function SourceAppSelectionCard({
  app,
  isSelected,
  multiSelectActive,
  disabled,
  onSelect,
}: {
  app: AppDisplay;
  isSelected: boolean;
  multiSelectActive: boolean;
  disabled: boolean;
  onSelect: (app: AppDisplay) => void;
}) {
  const t = useI18n();
  return (
    <SelectableCard
      onClick={() => onSelect(app)}
      aria-label={app.name}
      selected={isSelected}
      disabled={disabled}
      icon={<Image src={app.iconUrl} alt={app.name} w={28} h={28} fit="contain" style={{ flexShrink: 0 }} />}
      title={app.name}
      description={app.description}
      footerLeft={
        <Text size="xs" c="dimmed">
          {multiSelectActive && isSelected ? t("app.action.select.selected") : t("app.action.select.application")}
        </Text>
      }
    />
  );
}
