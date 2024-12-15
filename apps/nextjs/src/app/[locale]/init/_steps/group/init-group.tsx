"use client";

import { Button, Card, Stack, TextInput } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useZodForm } from "@homarr/form";
import { useI18n } from "@homarr/translation/client";
import type { z } from "@homarr/validation";
import { validation } from "@homarr/validation";

export const InitGroup = () => {
  const t = useI18n();
  const { mutateAsync } = clientApi.group.createInitialExternalGroup.useMutation();
  const form = useZodForm(validation.group.create, {
    initialValues: {
      name: "",
    },
  });

  const handleSubmitAsync = async (values: z.infer<typeof validation.group.create>) => {
    await mutateAsync(values, {
      async onSuccess() {
        await revalidatePathActionAsync("/init");
      },
      onError(error) {
        if (error.data?.code === "CONFLICT") {
          form.setErrors({ name: t("common.zod.errors.custom.groupNameTaken") });
        }
      },
    });
  };

  return (
    <Card w={64 * 6} maw="90vw" withBorder>
      <form onSubmit={form.onSubmit(handleSubmitAsync)}>
        <Stack>
          <TextInput
            label={t("init.step.group.form.name.label")}
            description={t("init.step.group.form.name.description")}
            withAsterisk
            {...form.getInputProps("name")}
          />
          <Button type="submit" loading={form.submitting} rightSection={<IconArrowRight size={16} stroke={1.5} />}>
            {t("common.action.continue")}
          </Button>
        </Stack>
      </form>
    </Card>
  );
};
