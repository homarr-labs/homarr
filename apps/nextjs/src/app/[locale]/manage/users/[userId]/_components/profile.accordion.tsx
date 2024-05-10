"use client";

import { Button, Stack, TextInput } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import {
  showErrorNotification,
  showSuccessNotification,
} from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface ProfileAccordionProps {
  user: NonNullable<RouterOutputs["user"]["getById"]>;
}

export const ProfileAccordion = ({ user }: ProfileAccordionProps) => {
  const t = useI18n();
  const { mutate, isPending } =
    clientApi.user.editProfile.useMutation({
      onError(error) {
        showErrorNotification({
          title: t(
            "management.page.user.edit.section.profile.editProfile.title",
          ),
          message: error.message,
        });
      },
      onSuccess: () => {
        showSuccessNotification({
          title: t(
            "management.page.user.edit.section.profile.editProfile.title",
          ),
          message: t(
            "management.page.user.edit.section.profile.editProfile.message.profileUpdated",
          ),
        });
      },
      onSettled: async () => {
        await revalidatePathAction("/manage/users");
      },
    });
  const form = useForm({
    initialValues: {
      name: user.name ?? "",
      email: user.email ?? "",
    },
    validate: zodResolver(validation.user.editProfile),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  const handleSubmit = () => {
    mutate({
      userId: user.id,
      form: form.values,
    });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <TextInput
          label={t("user.field.username.label")}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <TextInput
          label={t("user.field.email.label")}
          {...form.getInputProps("email")}
        />
        <Button
          type="submit"
          disabled={!form.isValid() || !form.isDirty()}
          loading={isPending}
        >
          {t("common.action.save")}
        </Button>
      </Stack>
    </form>
  );
};
