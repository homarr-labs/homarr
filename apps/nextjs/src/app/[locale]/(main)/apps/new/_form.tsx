"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Button, Group, Stack, Textarea, TextInput } from "@homarr/ui";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

// TODO: add validation
// TODO: add icon picker
export const NewAppForm = () => {
  const t = useI18n();
  const router = useRouter();

  const form = useForm({
    initialValues: {
      name: "",
      description: "",
      iconUrl: "",
      href: "",
    },
    validate: zodResolver(validation.app.create),
  });
  const { mutate, isPending } = clientApi.app.create.useMutation({
    onSuccess: () => {
      showSuccessNotification({
        title: t("app.page.create.notification.success.title"),
        message: t("app.page.create.notification.success.message"),
      });
      void revalidatePathAction("/apps").then(() => {
        router.push("/apps");
      });
    },
    onError: () => {
      showErrorNotification({
        title: t("app.page.create.notification.error.title"),
        message: t("app.page.create.notification.error.message"),
      });
    },
  });

  return (
    <form
      onSubmit={form.onSubmit((v) =>
        mutate(v, {
          onSuccess: () => {
            void revalidatePathAction("/apps").then(() => {
              router.push("/apps");
            });
          },
        }),
      )}
    >
      <Stack>
        <TextInput {...form.getInputProps("name")} withAsterisk label="Name" />
        <TextInput
          {...form.getInputProps("iconUrl")}
          withAsterisk
          label="Icon URL"
        />
        <Textarea {...form.getInputProps("description")} label="Description" />
        <TextInput {...form.getInputProps("href")} label="URL" />

        <Group justify="end">
          <Button variant="default" component={Link} href="/apps">
            {t("common.action.backToOverview")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("common.action.create")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};
