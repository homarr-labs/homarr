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
import { IconArrowLeft, IconPlus, IconSearch } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createModal, modalSizeSelect } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { selectGridCols, SelectableCard } from "@homarr/ui";

import { AppForm } from "@homarr/forms-collection";
import { useSession } from "@homarr/auth/client";
import { showErrorNotification } from "@homarr/notifications";

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
  const [creating, setCreating] = useState(false);
  const t = useI18n();
  const { data: apps = [], isPending } = clientApi.app.selectable.useQuery();
  const { data: session } = useSession();
  const utils = clientApi.useUtils();
  const canCreate = innerProps.withCreate && Boolean(session?.user.permissions.includes("app-create"));
  const { mutateAsync: createApp, isPending: isCreating } = clientApi.app.create.useMutation({
    onError: () =>
      showErrorNotification({
        title: t("common.notification.create.error"),
        message: t("app.page.create.notification.error.message"),
      }),
  });
  const multiSelectAvailable = Boolean(innerProps.onSelectMany);

  const selectableApps = useMemo(
    () => [...apps, ...createdApps.filter((createdApp) => !apps.some((app) => app.id === createdApp.id))],
    [apps, createdApps],
  );

  const filteredApps = useMemo(
    () =>
      selectableApps
        .filter((app) => {
          const query = search.trim().toLowerCase();
          return app.name.toLowerCase().includes(query) || Boolean(app.href?.toLowerCase().includes(query));
        })
        .sort((appA, appB) => appA.name.localeCompare(appB.name)),
    [search, selectableApps],
  );

  const selectedApps = useMemo(
    () => selectableApps.filter((app) => selectedAppIds.has(app.id)),
    [selectableApps, selectedAppIds],
  );

  const handleSelect = (app: SelectableApp) => {
    if (!multiSelectAvailable) {
      innerProps.onSelect?.(app);
      actions.closeModal();
      return;
    }
    setSelectedAppIds((current) => {
      const next = new Set(current);
      if (next.has(app.id)) next.delete(app.id);
      else next.add(app.id);
      return next;
    });
  };

  const handleMultiSubmit = () => {
    innerProps.onSelectMany?.(selectedApps);
    actions.closeModal();
  };

  return (
    <Stack gap="md">
      {creating ? (
        <Stack>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => setCreating(false)}
            disabled={isCreating}
            style={{ alignSelf: "flex-start" }}
          >
            {t("app.action.select.backToApps")}
          </Button>
          <AppForm
            showBackToOverview={false}
            buttonLabels={{
              submit: t("app.action.select.createAndAdd"),
              submitAndCreateAnother: multiSelectAvailable ? t("app.action.select.createAnother") : undefined,
            }}
            isPending={isCreating}
            handleSubmit={async (values, finish, afterSuccess) => {
              const app = await createApp(values);
              setCreatedApps((current) => [...current, app]);
              setSelectedAppIds((current) => new Set(current).add(app.id));
              void utils.app.invalidate();
              if (!finish) {
                afterSuccess?.();
                return;
              }
              if (multiSelectAvailable) innerProps.onSelectMany?.([...selectedApps, app]);
              else innerProps.onSelect?.(app);
              actions.closeModal();
            }}
          />
        </Stack>
      ) : (
        <>
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
                {canCreate && (
                  <SelectableCard
                    onClick={() => setCreating(true)}
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
                    multiSelectActive={multiSelectAvailable}
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
        </>
      )}

      {/* Multi-Select Action Footer */}
      {multiSelectAvailable && (
        <Paper withBorder p="xs" radius="md" bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))">
          <Group justify="space-between" align="center">
            <Text size="sm" fw={600}>
              {t("app.action.select.appsSelected", { count: selectedApps.length })}
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                disabled={selectedApps.length === 0 || isCreating}
                onClick={() => setSelectedAppIds(new Set())}
              >
                {t("common.action.discard")}
              </Button>
              <Button
                color="primaryColor"
                size="xs"
                disabled={selectedApps.length === 0 || creating}
                onClick={handleMultiSubmit}
              >
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
