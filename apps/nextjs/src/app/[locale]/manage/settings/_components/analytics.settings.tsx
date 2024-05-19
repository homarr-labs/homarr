"use client";

import type { ReactNode } from "react";
import React from "react";
import type { MantineSpacing } from "@mantine/core";
import {
  Card,
  Group,
  LoadingOverlay,
  Stack,
  Switch,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import type { UseFormReturnType } from "@homarr/form";
import { useForm } from "@homarr/form";
import type { defaultServerSettings } from "@homarr/server-settings";
import { useScopedI18n } from "@homarr/translation/client";
import { revalidatePathActionAsync } from "~/app/revalidatePathAction";

interface AnalyticsSettingsProps {
  initialData: typeof defaultServerSettings.analytics;
}

export const AnalyticsSettings = ({ initialData }: AnalyticsSettingsProps) => {
  const t = useScopedI18n("management.page.settings.section.analytics");
  const form = useForm({
    initialValues: initialData,
    onValuesChange: (updatedValues, _) => {
      if (!form.isValid()) {
        return;
      }

      if (
        !updatedValues.enableGeneral &&
        (updatedValues.enableWidgetData ||
          updatedValues.enableIntegrationData ||
          updatedValues.enableUserData)
      ) {
        updatedValues.enableIntegrationData = false;
        updatedValues.enableUserData = false;
        updatedValues.enableWidgetData = false;
      }

      void mutateAsync({
        settingsKey: "analytics",
        value: updatedValues,
      });
    },
  });

  const { mutateAsync, isPending } =
    clientApi.serverSettings.saveSettings.useMutation({
      onSettled: async () => {
        await revalidatePathActionAsync("/manage/settings");
      },
    });

  return (
    <>
      <Title order={2}>{t("title")}</Title>

      <Card pos="relative" withBorder>
        <LoadingOverlay
          visible={isPending}
          zIndex={1000}
          overlayProps={{ radius: "sm", blur: 2 }}
        />
        <Stack>
          <SwitchSetting
            form={form}
            formKey="enableGeneral"
            title={t("general.title")}
            text={t("general.text")}
          />
          <SwitchSetting
            form={form}
            formKey="enableIntegrationData"
            ms="xl"
            title={t("integrationData.title")}
            text={t("integrationData.text")}
          />
          <SwitchSetting
            form={form}
            formKey="enableWidgetData"
            ms="xl"
            title={t("widgetData.title")}
            text={t("widgetData.text")}
          />
          <SwitchSetting
            form={form}
            formKey="enableUserData"
            ms="xl"
            title={t("usersData.title")}
            text={t("usersData.text")}
          />
        </Stack>
      </Card>
    </>
  );
};

const SwitchSetting = ({
  form,
  ms,
  title,
  text,
  formKey,
}: {
  form: UseFormReturnType<typeof defaultServerSettings.analytics>;
  formKey: keyof typeof defaultServerSettings.analytics;
  ms?: MantineSpacing;
  title: string;
  text: ReactNode;
}) => {
  const handleClick = React.useCallback(() => {
    form.setFieldValue(formKey, !form.values[formKey]);
  }, [form, formKey]);
  return (
    <UnstyledButton onClick={handleClick}>
      <Group
        ms={ms}
        justify="space-between"
        gap="lg"
        align="center"
        wrap="nowrap"
      >
        <Stack gap={0}>
          <Text fw="bold">{title}</Text>
          <Text c="gray.5">{text}</Text>
        </Stack>
        <Switch {...form.getInputProps(formKey, { type: "checkbox" })} />
      </Group>
    </UnstyledButton>
  );
};
