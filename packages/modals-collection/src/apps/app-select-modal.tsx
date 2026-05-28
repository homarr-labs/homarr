import { useMemo, useState } from "react";
import { Button, Card, Center, Stack, Text } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createModal, modalSizeSelect, useModalAction } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { SelectGridLayout, selectGridCardHeight } from "@homarr/ui";

import { QuickAddAppModal } from "./quick-add-app/quick-add-app-modal";

interface AppSelectModalProps {
  onSelect?: (app: RouterOutputs["app"]["selectable"][number]) => void;
  withCreate: boolean;
}

export const AppSelectModal = createModal<AppSelectModalProps>(({ actions, innerProps }) => {
  const [search, setSearch] = useState("");
  const t = useI18n();
  const { data: apps = [], isPending } = clientApi.app.selectable.useQuery();
  const { openModal: openQuickAddAppModal } = useModalAction(QuickAddAppModal);

  const filteredApps = useMemo(
    () =>
      apps
        .filter((app) => app.name.toLowerCase().includes(search.toLowerCase()))
        .sort((appA, appB) => appA.name.localeCompare(appB.name)),
    [apps, search],
  );

  const handleSelect = (app: RouterOutputs["app"]["selectable"][number]) => {
    innerProps.onSelect?.(app);
    actions.closeModal();
  };

  const handleAddNewApp = () => {
    openQuickAddAppModal({
      onClose(app) {
        innerProps.onSelect?.(app);
        actions.closeModal();
      },
    });
  };

  return (
    <SelectGridLayout
      search={search}
      onSearchChange={setSearch}
      placeholder={`${t("app.action.select.search")}...`}
      onSearchKeyDown={(event) => {
        if (event.key === "Enter" && filteredApps.length === 1 && filteredApps[0]) {
          handleSelect(filteredApps[0]);
        }
      }}
    >
      {innerProps.withCreate && (
        <Card h={selectGridCardHeight} withBorder>
          <Stack justify="space-between" h="100%" gap="xs">
            <Stack gap="xs">
              <Center>
                <IconPlus size={24} />
              </Center>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center" lineClamp={2}>
                {t("app.action.create.title")}
              </Text>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed" lineClamp={2}>
                {t("app.action.create.description")}
              </Text>
            </Stack>
            <Button onClick={handleAddNewApp} variant="light" size="xs" mt="auto" fullWidth>
              {t("app.action.create.action")}
            </Button>
          </Stack>
        </Card>
      )}

      {filteredApps.map((app) => (
        <Card key={app.id} h={selectGridCardHeight} withBorder>
          <Stack justify="space-between" h="100%" gap="xs">
            <Stack gap="xs">
              <Center>
                <img src={app.iconUrl} alt={app.name} width={24} height={24} />
              </Center>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center" lineClamp={2}>
                {app.name}
              </Text>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed" lineClamp={2}>
                {app.description ?? ""}
              </Text>
            </Stack>
            <Button onClick={() => handleSelect(app)} variant="light" size="xs" mt="auto" fullWidth>
              {t("app.action.select.action", { app: app.name })}
            </Button>
          </Stack>
        </Card>
      ))}

      {filteredApps.length === 0 && !isPending && (
        <Center p="xl">
          <Text c="dimmed">{t("app.action.select.noResults")}</Text>
        </Center>
      )}
    </SelectGridLayout>
  );
}).withOptions({
  defaultTitle: (t) => t("app.action.select.title"),
  size: modalSizeSelect,
});
