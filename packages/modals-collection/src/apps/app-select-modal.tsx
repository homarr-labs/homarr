import { useMemo, useState } from "react";
import { Box, Button, Card, Center, Group, Stack, Text, Tooltip } from "@mantine/core";
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
        <Card
          h={selectGridCardHeight}
          withBorder
          pos="relative"
          style={{ overflow: "hidden", "--_hover-opacity": "0" }}
          onMouseEnter={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "1")}
          onMouseLeave={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "0")}
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
          </Stack>
          <Box
            pos="absolute"
            bottom={0}
            left={0}
            right={0}
            p="xs"
            style={{
              opacity: "var(--_hover-opacity)",
              transition: "opacity 150ms ease",
              background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
            }}
          >
            <Button onClick={handleAddNewApp} variant="light" size="xs" fullWidth>
              {t("app.action.create.action")}
            </Button>
          </Box>
        </Card>
      )}

      {filteredApps.map((app) => (
        <Card
          key={app.id}
          h={selectGridCardHeight}
          withBorder
          pos="relative"
          style={{ overflow: "hidden", "--_hover-opacity": "0" }}
          onMouseEnter={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "1")}
          onMouseLeave={(e) => e.currentTarget.style.setProperty("--_hover-opacity", "0")}
        >
          <Stack h="100%" gap="xs">
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <img src={app.iconUrl} alt={app.name} width={22} height={22} style={{ flexShrink: 0, marginTop: 2 }} />
              <Text lh={1.2} style={{ whiteSpace: "normal" }} fw={500} size="sm" lineClamp={2}>
                {app.name}
              </Text>
            </Group>
            <Tooltip label={app.description} multiline w={250} disabled={!app.description}>
              <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" c="dimmed" lineClamp={1}>
                {app.description ?? ""}
              </Text>
            </Tooltip>
          </Stack>
          <Box
            pos="absolute"
            bottom={0}
            left={0}
            right={0}
            p="xs"
            style={{
              opacity: "var(--_hover-opacity)",
              transition: "opacity 150ms ease",
              background: "linear-gradient(transparent, var(--mantine-color-body) 30%)",
            }}
          >
            <Button onClick={() => handleSelect(app)} variant="light" size="xs" fullWidth>
              {t("app.action.select.action", { app: app.name })}
            </Button>
          </Box>
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
