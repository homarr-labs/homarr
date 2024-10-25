"use client";

import { Button, Group, Stack } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { useForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { ServerSettings } from "@homarr/server-settings";

export const CommonSettingsForm = <TKey extends keyof ServerSettings>({
  settingKey,
  defaultValues,
  children,
}: {
  settingKey: TKey;
  defaultValues: ServerSettings[TKey];
  children: (form: ReturnType<typeof useForm<ServerSettings[TKey]>>) => React.ReactNode;
}) => {
  const { mutateAsync, isPending } = clientApi.serverSettings.saveSettings.useMutation({
    onSuccess() {
      showSuccessNotification({
        message: "Settings saved successfully",
      });
    },
    onError() {
      showErrorNotification({
        message: "Failed to save settings",
      });
    },
  });
  const form = useForm({
    initialValues: defaultValues,
  });

  const handleSubmitAsync = async (values: ServerSettings[TKey]) => {
    await mutateAsync({
      settingsKey: settingKey,
      value: values,
    });
  };

  return (
    <form onSubmit={form.onSubmit((values) => void handleSubmitAsync(values))}>
      <Stack gap="sm">
        {children(form)}
        <Group justify="end">
          <Button type="submit" loading={isPending}>
            Save
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
