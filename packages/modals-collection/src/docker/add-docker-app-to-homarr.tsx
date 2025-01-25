import { Button, Group, Image, List, LoadingOverlay, Stack, Text, TextInput } from "@mantine/core";
import { z } from "zod";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

interface AddDockerAppToHomarrProps {
  selectedContainers: RouterOutputs["docker"]["getContainers"]["containers"];
}

export const AddDockerAppToHomarrModal = createModal<AddDockerAppToHomarrProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const form = useZodForm(
    z.object({
      containerUrls: z.array(z.string().url().nullable()),
    }),
    {
      initialValues: {
        containerUrls: innerProps.selectedContainers.map((container) => {
          if (container.ports[0]) {
            return `http://${container.ports[0].IP}:${container.ports[0].PublicPort}`;
          }

          return null;
        }),
      },
    },
  );
  const { mutate, isPending } = clientApi.app.createMany.useMutation({
    onSuccess() {
      actions.closeModal();
      showSuccessNotification({
        title: t("docker.action.addToHomarr.notification.success.title"),
        message: t("docker.action.addToHomarr.notification.success.message"),
      });
    },
    onError() {
      showErrorNotification({
        title: t("docker.action.addToHomarr.notification.error.title"),
        message: t("docker.action.addToHomarr.notification.error.message"),
      });
    },
  });
  const handleSubmit = () => {
    mutate(
      innerProps.selectedContainers.map((container, index) => ({
        name: container.name,
        iconUrl: container.iconUrl,
        description: null,
        href: form.values.containerUrls[index] ?? null,
      })),
    );
  };
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <LoadingOverlay visible={isPending} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
      <Stack>
        <List>
          {innerProps.selectedContainers.map((container, index) => (
            <List.Item
              styles={{ itemWrapper: { width: "100%" }, itemLabel: { flex: 1 } }}
              icon={<Image src={container.iconUrl} alt="container image" w={30} h={30} />}
              key={container.id}
            >
              <Group justify="space-between">
                <Text>{container.name}</Text>
                <TextInput {...form.getInputProps(`containerUrls.${index}`)} />
              </Group>
            </List.Item>
          ))}
        </List>
        <Group justify="end">
          <Button onClick={actions.closeModal} variant="light">
            {t("common.action.cancel")}
          </Button>
          <Button disabled={!form.isValid()} type="submit">
            {t("common.action.add")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({
  defaultTitle(t) {
    return t("docker.action.addToHomarr.modal.title");
  },
});
