"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button, Card, Divider, Group, Radio, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { useZodForm } from "@homarr/form";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import {
  userChangeHomeBoardsSchema,
  userChangeSearchPreferencesSchema,
  userEditProfileSchema,
  userFirstDayOfWeekSchema,
  userPingIconsEnabledSchema,
} from "@homarr/validation/user";
import { z } from "zod/v4";

import type { Board } from "~/app/[locale]/boards/_types";
import { BoardSelect } from "~/components/board/board-select";
import { CurrentLanguageCombobox } from "~/components/language/current-language-combobox";

dayjs.extend(localeData);

const userGeneralSettingsSchema = z.object({
  name: userEditProfileSchema.shape.name,
  email: userEditProfileSchema.shape.email,
  homeBoardId: userChangeHomeBoardsSchema.shape.homeBoardId,
  mobileHomeBoardId: userChangeHomeBoardsSchema.shape.mobileHomeBoardId,
  defaultSearchEngineId: userChangeSearchPreferencesSchema.shape.defaultSearchEngineId,
  openInNewTab: userChangeSearchPreferencesSchema.shape.openInNewTab,
  firstDayOfWeek: userFirstDayOfWeekSchema.shape.firstDayOfWeek,
  pingIconsEnabled: userPingIconsEnabledSchema.shape.pingIconsEnabled,
});

type FormValues = z.infer<typeof userGeneralSettingsSchema>;

const FIRST_DAY_OPTIONS: { value: DayOfWeek; labelKey: number }[] = [
  { value: 1, labelKey: 1 },
  { value: 6, labelKey: 6 },
  { value: 0, labelKey: 0 },
];

interface UserGeneralSettingsFormProps {
  user: RouterOutputs["user"]["getById"];
  boardsData: Pick<Board, "id" | "name" | "logoImageUrl">[];
  searchEnginesData: { value: string; label: string }[];
  showLanguageSelector?: boolean;
}

const buildInitialValues = (user: RouterOutputs["user"]["getById"]): FormValues => ({
  name: user.name ?? "",
  email: user.email ?? "",
  homeBoardId: user.homeBoardId,
  mobileHomeBoardId: user.mobileHomeBoardId,
  defaultSearchEngineId: user.defaultSearchEngineId,
  openInNewTab: user.openSearchInNewTab,
  firstDayOfWeek: user.firstDayOfWeek as DayOfWeek,
  pingIconsEnabled: user.pingIconsEnabled,
});

export const UserGeneralSettingsForm = ({
  user,
  boardsData,
  searchEnginesData,
  showLanguageSelector = false,
}: UserGeneralSettingsFormProps) => {
  const t = useI18n();
  const tGeneral = useScopedI18n("management.page.user.setting.general");
  const isCredentialsUser = user.provider === "credentials";

  const editProfileMutation = clientApi.user.editProfile.useMutation();
  const changeHomeBoardsMutation = clientApi.user.changeHomeBoards.useMutation();
  const changeSearchPreferencesMutation = clientApi.user.changeSearchPreferences.useMutation();
  const changeFirstDayOfWeekMutation = clientApi.user.changeFirstDayOfWeek.useMutation();
  const changePingIconsEnabledMutation = clientApi.user.changePingIconsEnabled.useMutation();

  const initialValues = buildInitialValues(user);
  const initialValuesRef = useRef(initialValues);

  const form = useZodForm(userGeneralSettingsSchema, {
    initialValues,
  });

  const isDirtyRef = useRef(false);
  isDirtyRef.current = form.isDirty();

  const weekDays = useMemo(() => dayjs.weekdays(false), []);

  const mutations = [editProfileMutation, changeHomeBoardsMutation, changeSearchPreferencesMutation, changeFirstDayOfWeekMutation, changePingIconsEnabledMutation];
  const isPending = mutations.some((m) => m.isPending);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return;
      if (isDirtyRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleSubmit = async (values: FormValues) => {
    const parsed = userGeneralSettingsSchema.safeParse(values);
    if (!parsed.success) return;

    const defaults = initialValuesRef.current;
    const changed = <K extends keyof FormValues>(...fields: K[]) =>
      fields.some((f) => (f === "email" ? (values[f] || null) !== (defaults[f] || null) : values[f] !== defaults[f]));

    const saveActions: { when: boolean; action: () => Promise<unknown> }[] = [
      {
        when: isCredentialsUser && changed("name", "email"),
        action: () => editProfileMutation.mutateAsync({ id: user.id, name: parsed.data.name, email: parsed.data.email ?? "" }),
      },
      {
        when: changed("homeBoardId", "mobileHomeBoardId"),
        action: () => changeHomeBoardsMutation.mutateAsync({ userId: user.id, homeBoardId: parsed.data.homeBoardId, mobileHomeBoardId: parsed.data.mobileHomeBoardId }),
      },
      {
        when: changed("defaultSearchEngineId", "openInNewTab"),
        action: () => changeSearchPreferencesMutation.mutateAsync({ userId: user.id, defaultSearchEngineId: parsed.data.defaultSearchEngineId, openInNewTab: parsed.data.openInNewTab }),
      },
      {
        when: changed("firstDayOfWeek"),
        action: () => changeFirstDayOfWeekMutation.mutateAsync({ id: user.id, firstDayOfWeek: parsed.data.firstDayOfWeek }),
      },
      {
        when: changed("pingIconsEnabled"),
        action: () => changePingIconsEnabledMutation.mutateAsync({ id: user.id, pingIconsEnabled: parsed.data.pingIconsEnabled }),
      },
    ];

    const promises = saveActions.filter((s) => s.when).map((s) => s.action());
    if (promises.length === 0) return;

    try {
      await Promise.all(promises);
      const newValues = { ...parsed.data, email: parsed.data.email ?? "" };
      initialValuesRef.current = newValues;
      form.setInitialValues(newValues);
      form.resetDirty();
      await revalidatePathActionAsync(`/manage/users/${user.id}`);
      showSuccessNotification({
        title: t("common.notification.update.success"),
        message: t("common.notification.update.success"),
      });
    } catch {
      showErrorNotification({
        title: t("common.notification.update.error"),
        message: t("common.notification.update.error"),
      });
    }
  };

  const handleDiscard = () => {
    form.setValues(initialValuesRef.current);
    form.resetDirty();
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" verticalSpacing="lg">
          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{t("user.name")}</Title>
                {!isCredentialsUser && (
                  <Text c="dimmed" size="sm">
                    {t("management.page.user.fieldsDisabledExternalProvider")}
                  </Text>
                )}
              </Stack>
              <Divider />
              <TextInput
                disabled={!isCredentialsUser}
                label={t("user.field.username.label")}
                withAsterisk
                {...form.getInputProps("name")}
              />
              <TextInput
                disabled={!isCredentialsUser}
                label={t("user.field.email.label")}
                {...form.getInputProps("email")}
              />
            </Stack>
          </Card>

          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.board.title")}</Title>
              </Stack>
              <Divider />
              <BoardSelect
                label={tGeneral("item.board.type.general")}
                clearable
                boards={boardsData}
                w="100%"
                {...form.getInputProps("homeBoardId")}
              />
              <BoardSelect
                label={tGeneral("item.board.type.mobile")}
                clearable
                boards={boardsData}
                w="100%"
                {...form.getInputProps("mobileHomeBoardId")}
              />
            </Stack>
          </Card>

          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.search")}</Title>
              </Stack>
              <Divider />
              <Select
                label={t("user.field.defaultSearchEngine.label")}
                w="100%"
                data={searchEnginesData}
                {...form.getInputProps("defaultSearchEngineId")}
              />
              <Switch
                label={t("user.field.openSearchInNewTab.label")}
                {...form.getInputProps("openInNewTab", { type: "checkbox" })}
              />
            </Stack>
          </Card>

          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.language")}</Title>
              </Stack>
              <Divider />
              {showLanguageSelector && <CurrentLanguageCombobox />}
              <Title order={4}>{tGeneral("item.firstDayOfWeek")}</Title>
              <Radio.Group {...form.getInputProps("firstDayOfWeek")}>
                <Group mt="xs" wrap="wrap">
                  {FIRST_DAY_OPTIONS.map(({ value: dayValue, labelKey }) => (
                    <Radio key={dayValue} value={dayValue} label={weekDays[labelKey]} />
                  ))}
                </Group>
              </Radio.Group>
              <Divider my="xs" />
              <Title order={4}>{tGeneral("item.accessibility")}</Title>
              <Switch
                label={t("user.field.pingIconsEnabled.label")}
                {...form.getInputProps("pingIconsEnabled", { type: "checkbox" })}
              />
            </Stack>
          </Card>
        </SimpleGrid>

        <div style={{ position: "sticky", bottom: 20 }}>
          {form.isDirty() && (
            <Card withBorder>
              <Group justify="space-between" wrap="wrap">
                <Text fw={500}>{t("common.unsavedChanges")}</Text>
                <Group>
                  <Button disabled={isPending} variant="default" onClick={handleDiscard}>
                    {t("common.action.discard")}
                  </Button>
                  <Button loading={isPending} type="submit" disabled={!form.isValid()}>
                    {t("common.action.saveChanges")}
                  </Button>
                </Group>
              </Group>
            </Card>
          )}
        </div>
      </Stack>
    </form>
  );
};
