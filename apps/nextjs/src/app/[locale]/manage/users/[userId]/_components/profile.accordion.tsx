"use client";

import { Button, Stack, TextInput } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useForm, zodResolver } from "@homarr/form";
import { useScopedI18n } from "@homarr/translation/client";
import { validation } from "@homarr/validation";

import { revalidatePathAction } from "~/app/revalidatePathAction";

interface ProfileAccordionProps {
  user: NonNullable<RouterOutputs["user"]["getById"]>;
}

export const ProfileAccordion = ({ user }: ProfileAccordionProps) => {
  const t = useScopedI18n("management.page.user.edit.section.profile");
  const { mutate, isPending } = clientApi.user.editProfile.useMutation({
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
          label={t("form.username.label")}
          withAsterisk
          {...form.getInputProps("name")}
        />
        <TextInput
          label={t("form.email.label")}
          {...form.getInputProps("email")}
        />
        <Button type="submit" disabled={!form.isValid()} loading={isPending}>
          Submit
        </Button>
      </Stack>
    </form>
  );
};
