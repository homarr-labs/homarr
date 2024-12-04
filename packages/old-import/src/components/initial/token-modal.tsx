import { Button, Group, PasswordInput, Stack } from "@mantine/core";
import { z } from "zod";

import { clientApi } from "@homarr/api/client";
import { useZodForm } from "@homarr/form";
import { createModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

interface InnerProps {
  checksum: string;
  onSuccessAsync: (token: string) => Promise<void>;
}

const formSchema = z.object({
  token: z.string().min(1).max(256),
});

export const ImportTokenModal = createModal<InnerProps>(({ actions, innerProps }) => {
  const t = useI18n();
  const tTokenModal = useScopedI18n("init.step.import.tokenModal");
  const { mutate, isPending } = clientApi.import.validateToken.useMutation();
  const form = useZodForm(formSchema, { initialValues: { token: "" } });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    mutate(
      { checksum: innerProps.checksum, token: values.token },
      {
        async onSuccess(isValid) {
          if (isValid) {
            actions.closeModal();
            await innerProps.onSuccessAsync(values.token);
          } else {
            showErrorNotification({
              title: tTokenModal("notification.error.title"),
              message: tTokenModal("notification.error.message"),
            });
          }
        },
      },
    );
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <PasswordInput
          {...form.getInputProps("token")}
          label={tTokenModal("field.token.label")}
          description={tTokenModal("field.token.description")}
          withAsterisk
        />
        <Group justify="end">
          <Button variant="subtle" color="gray" onClick={actions.closeModal}>
            {t("common.action.cancel")}
          </Button>
          <Button type="submit" loading={isPending}>
            {t("common.action.confirm")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}).withOptions({ defaultTitle: (t) => t("init.step.import.tokenModal.title") });
