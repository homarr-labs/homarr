"use client";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import { showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { Button, PasswordInput, Stack, Title } from "@homarr/ui";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface SecurityAccordionComponentProps {
  user: NonNullable<RouterOutputs["user"]["getById"]>;
}

export const SecurityAccordionComponent = ({
  user,
}: SecurityAccordionComponentProps) => {
  return (
    <Stack>
      <ChangePasswordForm user={user} />
    </Stack>
  );
};

const ChangePasswordForm = ({
  user,
}: {
  user: NonNullable<RouterOutputs["user"]["getById"]>;
}) => {
  const t = useI18n();
  const { mutate, isPending } = clientApi.user.changePassword.useMutation({
    onSettled: async () => {
      await revalidatePathAction(`/manage/users/${user.id}`);
      showSuccessNotification({
        title: t(
          "management.page.user.edit.section.security.changePassword.message.passwordUpdated",
        ),
        message: "",
      });
    },
  });
  const form = useForm({
    initialValues: {
      userId: user.id,
      password: "",
    },
    validate: zodResolver(validation.user.changePassword),
    validateInputOnBlur: true,
    validateInputOnChange: true,
  });

  const handleSubmit = () => {
    mutate(form.values);
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Stack gap={0}>
          <Title order={5}>
            {t(
              "management.page.user.edit.section.security.changePassword.title",
            )}
          </Title>
          <PasswordInput
            label={t("user.field.password.label")}
            {...form.getInputProps("password")}
          />
        </Stack>
        <Button loading={isPending} type="submit" disabled={!form.isValid()}>
          {t("common.action.confirm")}
        </Button>
      </Stack>
    </form>
  );
};
