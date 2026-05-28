import { useMemo, useState } from "react";
import { Button, Card, Center, Grid, Group, Input, ScrollArea, Stack, Text, Title } from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSearch } from "@tabler/icons-react";
import type { z } from "zod/v4";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { AppForm } from "@homarr/forms-collection";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import type { appManageSchema } from "@homarr/validation/app";

interface AppSelectModalProps {
  onSelect?: (app: RouterOutputs["app"]["selectable"][number]) => void;
  withCreate: boolean;
}

export const AppSelectModal = createModal<AppSelectModalProps>(({ actions, innerProps }) => {
  const [step, setStep] = useState<"select" | "form">("select");
  const [search, setSearch] = useState("");
  const t = useI18n();
  const tScoped = useScopedI18n("app.page.create.notification");
  const { data: apps = [], isPending: isLoadingApps } = clientApi.app.selectable.useQuery();

  const { mutate, isPending: isCreating } = clientApi.app.create.useMutation({
    onError: () => {
      showErrorNotification({
        title: tScoped("error.title"),
        message: tScoped("error.message"),
      });
    },
  });

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

  const handleCreateSubmit = (values: z.infer<typeof appManageSchema>) => {
    mutate(values, {
      onSuccess(app) {
        showSuccessNotification({
          title: tScoped("success.title"),
          message: tScoped("success.message"),
        });
        innerProps.onSelect?.(app);
        actions.closeModal();
      },
    });
  };

  if (step === "form") {
    return (
      <ScrollArea.Autosize mah="80vh">
        <Group gap="xs" mb="md" style={{ cursor: "pointer" }} onClick={() => setStep("select")}>
          <IconArrowLeft size={18} />
          <Title order={4}>{t("app.action.create.title")}</Title>
        </Group>
        <AppForm
          buttonLabels={{
            submit: t("board.action.quickCreateApp.modal.createAndUse"),
          }}
          showBackToOverview={false}
          handleSubmit={handleCreateSubmit}
          isPending={isCreating}
        />
      </ScrollArea.Autosize>
    );
  }

  return (
    <Stack miw="min(1400px, 90vw)">
      <Input
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
        leftSection={<IconSearch />}
        placeholder={`${t("app.action.select.search")}...`}
        data-autofocus
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredApps.length === 1 && filteredApps[0]) {
            handleSelect(filteredApps[0]);
          }
        }}
      />

      <Grid>
        {innerProps.withCreate && (
          <Grid.Col span={{ xs: 12, sm: 4, md: 3 }}>
            <Card h="100%">
              <Stack justify="space-between" h="100%">
                <Stack gap="xs">
                  <Center>
                    <IconPlus size={24} />
                  </Center>
                  <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center">
                    {t("app.action.create.title")}
                  </Text>
                  <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed">
                    {t("app.action.create.description")}
                  </Text>
                </Stack>
                <Button onClick={() => setStep("form")} variant="light" size="xs" mt="auto" radius="md" fullWidth>
                  {t("app.action.create.action")}
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        )}

        {filteredApps.map((app) => (
          <Grid.Col key={app.id} span={{ xs: 12, sm: 4, md: 3 }}>
            <Card h="100%">
              <Stack justify="space-between" h="100%">
                <Stack gap="xs">
                  <Center>
                    <img src={app.iconUrl} alt={app.name} width={24} height={24} />
                  </Center>
                  <Text lh={1.2} style={{ whiteSpace: "normal" }} ta="center">
                    {app.name}
                  </Text>
                  <Text lh={1.2} style={{ whiteSpace: "normal" }} size="xs" ta="center" c="dimmed">
                    {app.description ?? ""}
                  </Text>
                </Stack>
                <Button onClick={() => handleSelect(app)} variant="light" size="xs" mt="auto" radius="md" fullWidth>
                  {t("app.action.select.action", { app: app.name })}
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        ))}

        {filteredApps.length === 0 && !isLoadingApps && (
          <Grid.Col span={12}>
            <Center p="xl">
              <Text c="dimmed">{t("app.action.select.noResults")}</Text>
            </Center>
          </Grid.Col>
        )}
      </Grid>
    </Stack>
  );
}).withOptions({
  defaultTitle: (t) => t("app.action.select.title"),
  size: "xxl",
});
