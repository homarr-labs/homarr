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
  const t = useI18n();
  const { data: apps = [], isPending } = clientApi.app.selectable.useQuery();
  const { openModal: openQuickAddAppModal } = useModalAction(QuickAddAppModal);
  const multiSelect = Boolean(innerProps.onSelectMany);

  const filteredApps = useMemo(
    () =>
      apps
        .filter((app) => app.name.toLowerCase().includes(search.toLowerCase()))
        .sort((appA, appB) => appA.name.localeCompare(appB.name)),
    [apps, search],
  );

  const selectedApps = useMemo(() => apps.filter((app) => selectedAppIds.has(app.id)), [apps, selectedAppIds]);

  const handleSelect = (app: SelectableApp, event?: React.MouseEvent) => {
    const isModifierPressed = multiSelect && Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey);

    if (innerProps.onSelect && !isModifierPressed && selectedAppIds.size === 0) {
      innerProps.onSelect(app);
      actions.closeModal();
      return;
    }

    if (multiSelect) {
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
        if (multiSelect) {
          setSelectedAppIds((current) => new Set(current).add(app.id));
          return;
        }
        innerProps.onSelect?.(app);
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
        opened={multiSelect}
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
                multiSelect={multiSelect}
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
      {multiSelect && selectedApps.length > 0 && (
        <Paper withBorder p="xs" radius="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              {t("app.action.select.appsSelected", { count: selectedApps.length })}
            </Text>
            <Group gap="xs">
              <Button variant="default" size="xs" onClick={() => setSelectedAppIds(new Set())}>
                {t("common.action.discard")}
              </Button>
              <Button color="primaryColor" size="xs" onClick={handleMultiSubmit}>
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
  multiSelect,
  onSelect,
}: {
  app: SelectableApp;
  isSelected: boolean;
  multiSelect: boolean;
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
          {multiSelect && isSelected ? t("app.action.select.selected") : t("app.action.select.application")}
        </Text>
      }
    />
  );
};
