import { useMemo, useState } from "react";
import { Button, Center, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconPlus, IconApps } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { CatalogItem, SelectGridLayout, selectGridCardHeight } from "@homarr/ui";

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

  const handleSelect = (app: SelectableApp) => {
    if (multiSelect) {
      setSelectedAppIds((current) => {
        const next = new Set(current);
        if (next.has(app.id)) next.delete(app.id);
        else next.add(app.id);
        return next;
      });
      return;
    }
    innerProps.onSelect?.(app);
    actions.closeModal();
  };

  const handleSubmit = () => {
    if (multiSelect) {
      innerProps.onSelectMany?.(selectedApps);
      actions.closeModal();
      return;
    }
    const [first] = filteredApps;
    if (first) {
      innerProps.onSelect?.(first);
      actions.closeModal();
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

  return (
    <>
      <SelectGridLayout
        search={search}
        onSearchChange={setSearch}
        placeholder={`${t("app.action.select.search")}...`}
        ariaLabel={t("app.action.select.search")}
        onSearchKeyDown={(event) => {
          if (event.key === "Enter" && filteredApps.length === 1 && filteredApps[0]) {
            handleSelect(filteredApps[0]);
          }
        }}
      >
        {innerProps.withCreate && (
          <CatalogItem
            height={selectGridCardHeight}
            label={t("app.action.create.title")}
            status={t("app.action.create.action")}
            onSelect={handleAddNewApp}
          >
            <Stack h="100%" gap="xs">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <IconPlus size={22} style={{ flexShrink: 0, marginTop: 2 }} />
                <Text lh={1.2} style={{ whiteSpace: "normal" }} fw={500} size="sm" lineClamp={2}>
                  {t("app.action.create.title")}
                </Text>
              </Group>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" c="dimmed" lineClamp={1}>
                {t("app.action.create.description")}
              </Text>
              <Text size="xs" c="blue" fw={500} mt="auto">
                {t("app.action.create.action")}
              </Text>
            </Stack>
          </CatalogItem>
        )}

        {filteredApps.map((app) => (
          <CatalogItem
            key={app.id}
            height={selectGridCardHeight}
            label={app.name}
            status={
              multiSelect
                ? selectedAppIds.has(app.id)
                  ? t("app.action.select.selected")
                  : t("app.action.select.toggle")
                : t("app.action.select.action", { app: app.name })
            }
            selected={multiSelect ? selectedAppIds.has(app.id) : undefined}
            onSelect={() => handleSelect(app)}
          >
            <Stack h="100%" gap="xs">
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <img src={app.iconUrl} alt={app.name} width={22} height={22} style={{ flexShrink: 0, marginTop: 2 }} />
                <Text lh={1.2} style={{ whiteSpace: "normal" }} fw={500} size="sm" lineClamp={2}>
                  {app.name}
                </Text>
                {multiSelect && selectedAppIds.has(app.id) && (
                  <IconCheck size={18} color="var(--mantine-primary-color-filled)" />
                )}
              </Group>
              <Tooltip label={app.description} multiline w={250} disabled={!app.description}>
                <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" c="dimmed" lineClamp={1}>
                  {app.description ?? ""}
                </Text>
              </Tooltip>
              <Text size="xs" c="blue" fw={500} mt="auto">
                {multiSelect
                  ? selectedAppIds.has(app.id)
                    ? t("app.action.select.selected")
                    : t("app.action.select.toggle")
                  : t("app.action.select.action", { app: app.name })}
              </Text>
            </Stack>
          </CatalogItem>
        ))}

        {filteredApps.length === 0 && !isPending && (
          <Center p="xl">
            <Text c="dimmed">{t("app.action.select.noResults")}</Text>
          </Center>
        )}
      </SelectGridLayout>
      {multiSelect && (
        <Group justify="flex-end" mt="md">
          <Button leftSection={<IconApps size={16} />} disabled={selectedAppIds.size === 0} onClick={handleSubmit}>
            {t("app.action.select.multiple", { count: String(selectedAppIds.size) })}
          </Button>
        </Group>
      )}
    </>
  );
}).withOptions({
  defaultTitle: (t) => t("app.action.select.title"),
  size: modalSizeSelect,
});
