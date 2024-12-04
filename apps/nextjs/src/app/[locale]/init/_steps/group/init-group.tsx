"use client";

import { Button, Card, Stack, TextInput } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export const InitGroup = () => {
  const t = useI18n();

  return (
    <Card w={64 * 6} maw="90vw">
      <Stack>
        <TextInput
          label={t("init.step.group.form.name.label")}
          description={t("init.step.group.form.name.description")}
          required
        />
        <Button rightSection={<IconArrowRight size={16} stroke={1.5} />}>{t("common.action.continue")}</Button>
      </Stack>
    </Card>
  );
};
