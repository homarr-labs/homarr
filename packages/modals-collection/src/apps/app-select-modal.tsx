import { useMemo, useState } from "react";
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
import { IconBulb, IconPlus, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { FloatingTip, selectGridCols, SelectableCard } from "@homarr/ui";

import { QuickAddAppModal } from "./quick-add-app/quick-add-app-modal";

type SelectableApp = RouterOutputs["app"]["selectable"][number];

interface AppSelectModalProps {
  onSelect?: (app: SelectableApp) => void;
  onSelectMany?: (apps: SelectableApp[]) => void;
  withCreate: boolean;
}

export const AppSelectModal = createModal<AppSelectModalProps>(({ actions, innerProps }) => {
  const [search, setSearch] = useState("");
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set());
  const [createdApps, setCreatedApps] = useState<SelectableApp[]>([]);
  const [multiSelectActive, setMultiSelectActive] = useState(false);
  const t = useI18n();
  const { data: apps = [], isPending } = clientApi.app.selectable.useQuery();
  const { openModal: openQuickAddAppModal } = useModalAction(QuickAddAppModal);
  const multiSelectAvailable = Boolean(innerProps.onSelectMany);

  const selectableApps = useMemo(
    () => [...apps, ...createdApps.filter((createdApp) => !apps.some((app) => app.id === createdApp.id))],
    [apps, createdApps],
  );

  const filteredApps = useMemo(
    () =>
      selectableApps
        .filter((app) => app.name.toLowerCase().includes(search.toLowerCase()))
        .sort((appA, appB) => appA.name.localeCompare(appB.name)),
    [search, selectableApps],
  );

  const selectedApps = useMemo(
    () => selectableApps.filter((app) => selectedAppIds.has(app.id)),
    [selectableApps, selectedAppIds],
  );

  const handleSelect = (app: SelectableApp, event?: React.MouseEvent) => {
    const isModifierPressed = multiSelectAvailable && Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey);

    if (!multiSelectActive && !isModifierPressed) {
      if (innerProps.onSelect) innerProps.onSelect(app);
      else innerProps.onSelectMany?.([app]);
      actions.closeModal();
      return;
    }

    if (multiSelectAvailable) {
      setMultiSelectActive(true);
      setSelectedAppIds((current) => {
        const next = new Set(current);
        if (next.has(app.id)) next.delete(app.id);
        else next.add(app.id);
        return next;
      });
    }
  };

  const handleAddNewApp = () => {
    openQuickAddAppModal({
      onClose(app) {
        if (multiSelectActive) {
          setCreatedApps((current) => [...current, app]);
          setSelectedAppIds((current) => new Set(current).add(app.id));
          return;
        }
        if (innerProps.onSelect) innerProps.onSelect(app);
        else innerProps.onSelectMany?.([app]);
        actions.closeModal();
      },
    });
  };

  const handleMultiSubmit = () => {
    innerProps.onSelectMany?.(selectedApps);
    actions.closeModal();
  };

  return (
    <Stack gap="md">
      <FloatingTip
        opened={multiSelectAvailable}
        showDelay={2_000}
        dismissAfter={3_000}
        transitionDuration={200}
        closable={false}
        alertProps={{ color: "primaryColor", icon: <IconBulb size={18} />, variant: "light" }}
      >
        {t("tips.multiSelectApps")}
      </FloatingTip>

      {/* Top Search Input */}
      <Stack gap={6}>
        <Input
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          placeholder={`${t("app.action.select.search")}...`}
          aria-label={t("app.action.select.search")}
          data-autofocus
          onKeyDown={(event) => {
            if (event.key === "Enter" && filteredApps.length === 1 && filteredApps[0]) {
              handleSelect(filteredApps[0]);
            }
          }}
        />
      </Stack>

      {/* Scrollable Container with App Cards */}
      <ScrollArea.Autosize mah="70vh" offsetScrollbars>
        <Stack gap="md" pt="xs" pr="xs" px={4}>
          <SimpleGrid cols={selectGridCols} spacing="sm">
            {innerProps.withCreate && (
              <SelectableCard
                onClick={handleAddNewApp}
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

            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                isSelected={selectedAppIds.has(app.id)}
                multiSelectActive={multiSelectActive}
                onSelect={handleSelect}
              />
            ))}
          </SimpleGrid>

          {filteredApps.length === 0 && !isPending && (
            <Center p="xl">
              <Text c="dimmed">{t("app.action.select.noResults")}</Text>
            </Center>
          )}
        </Stack>
      </ScrollArea.Autosize>

      {/* Multi-Select Action Footer */}
      {multiSelectActive && (
        <Paper withBorder p="xs" radius="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              {t("app.action.select.appsSelected", { count: selectedApps.length })}
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                disabled={selectedApps.length === 0}
                onClick={() => setSelectedAppIds(new Set())}
              >
                {t("common.action.discard")}
              </Button>
              <Button color="primaryColor" size="xs" disabled={selectedApps.length === 0} onClick={handleMultiSubmit}>
                {t("common.action.add")} ({selectedApps.length})
              </Button>
            </Group>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("app.action.select.title"),
  size: modalSizeSelect,
});

// =========================================================================
// AppCard: Variant 3 (Dashboard Inset) with Medium Title & Large App Icon
// =========================================================================
const AppCard = ({
  app,
  isSelected,
  multiSelectActive,
  onSelect,
}: {
  app: SelectableApp;
  isSelected: boolean;
  multiSelectActive: boolean;
  onSelect: (app: SelectableApp, event?: React.MouseEvent) => void;
}) => {
  const t = useI18n();

  return (
    <SelectableCard
      onClick={(event) => onSelect(app, event)}
      aria-label={app.name}
      selected={isSelected}
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
};
