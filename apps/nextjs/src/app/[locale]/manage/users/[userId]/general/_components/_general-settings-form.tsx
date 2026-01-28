"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button, Card, Divider, Group, Radio, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import { useForm } from "@tanstack/react-form";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
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

const getErrorMessage = (errors: unknown[]): string | undefined => {
  const messages = errors
    .map((err) => {
      if (typeof err === "string") return err;
      if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
      return null;
    })
    .filter(Boolean);
  return messages.length > 0 ? messages.join(", ") : undefined;
};

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

  const hasChangesRef = useRef(false);

  const form = useForm({
    defaultValues: buildInitialValues(user),
    validators: {
      onChange: userGeneralSettingsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const parsed = userGeneralSettingsSchema.safeParse(value);
      if (!parsed.success) return;

      const defaults = formApi.options.defaultValues as FormValues | undefined;
      if (!defaults) return;

      const hasChanged = <K extends keyof FormValues>(field: K) =>
        field === "email"
          ? (value[field] || null) !== (defaults[field] || null)
          : value[field] !== defaults[field];

      const promises: Promise<unknown>[] = [];

      const profileChanged = hasChanged("name") || hasChanged("email");
      if (isCredentialsUser && profileChanged) {
        promises.push(
          editProfileMutation.mutateAsync({
            id: user.id,
            name: parsed.data.name,
            email: parsed.data.email ?? "",
          }),
        );
      }

      const boardsChanged = hasChanged("homeBoardId") || hasChanged("mobileHomeBoardId");
      if (boardsChanged) {
        promises.push(
          changeHomeBoardsMutation.mutateAsync({
            userId: user.id,
            homeBoardId: parsed.data.homeBoardId,
            mobileHomeBoardId: parsed.data.mobileHomeBoardId,
          }),
        );
      }

      const searchChanged = hasChanged("defaultSearchEngineId") || hasChanged("openInNewTab");
      if (searchChanged) {
        promises.push(
          changeSearchPreferencesMutation.mutateAsync({
            userId: user.id,
            defaultSearchEngineId: parsed.data.defaultSearchEngineId,
            openInNewTab: parsed.data.openInNewTab,
          }),
        );
      }

      if (hasChanged("firstDayOfWeek")) {
        promises.push(
          changeFirstDayOfWeekMutation.mutateAsync({
            id: user.id,
            firstDayOfWeek: parsed.data.firstDayOfWeek,
          }),
        );
      }

      if (hasChanged("pingIconsEnabled")) {
        promises.push(
          changePingIconsEnabledMutation.mutateAsync({
            id: user.id,
            pingIconsEnabled: parsed.data.pingIconsEnabled,
          }),
        );
      }

      if (promises.length === 0) return;

      try {
        await Promise.all(promises);
        formApi.reset({ ...parsed.data, email: parsed.data.email ?? "" });
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
    },
  });

  hasChangesRef.current = !form.state.isDefaultValue;

  const weekDays = useMemo(() => dayjs.weekdays(false), []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return;
      if (hasChangesRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
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
              <form.Field name="name">
                {({ state, handleChange, handleBlur }) => (
                  <TextInput
                    disabled={!isCredentialsUser}
                    label={t("user.field.username.label")}
                    withAsterisk
                    value={state.value}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
              <form.Field name="email">
                {({ state, handleChange, handleBlur }) => (
                  <TextInput
                    disabled={!isCredentialsUser}
                    label={t("user.field.email.label")}
                    value={state.value ?? ""}
                    onChange={(e) => handleChange(e.target.value)}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
            </Stack>
          </Card>

          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.board.title")}</Title>
              </Stack>
              <Divider />
              <form.Field name="homeBoardId">
                {({ state, handleChange, handleBlur }) => (
                  <BoardSelect
                    label={tGeneral("item.board.type.general")}
                    clearable
                    boards={boardsData}
                    w="100%"
                    value={state.value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
              <form.Field name="mobileHomeBoardId">
                {({ state, handleChange, handleBlur }) => (
                  <BoardSelect
                    label={tGeneral("item.board.type.mobile")}
                    clearable
                    boards={boardsData}
                    w="100%"
                    value={state.value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
            </Stack>
          </Card>

          <Card withBorder bg="transparent">
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.search")}</Title>
              </Stack>
              <Divider />
              <form.Field name="defaultSearchEngineId">
                {({ state, handleChange, handleBlur }) => (
                  <Select
                    label={t("user.field.defaultSearchEngine.label")}
                    w="100%"
                    data={searchEnginesData}
                    value={state.value}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
              <form.Field name="openInNewTab">
                {({ state, handleChange, handleBlur }) => (
                  <Switch
                    label={t("user.field.openSearchInNewTab.label")}
                    checked={state.value}
                    onChange={(e) => handleChange(e.currentTarget.checked)}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
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
              <form.Field name="firstDayOfWeek">
                {({ state, handleChange, handleBlur }) => (
                  <Radio.Group
                    value={String(state.value)}
                    onChange={(value) => handleChange(parseInt(value) as DayOfWeek)}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  >
                    <Group mt="xs" wrap="wrap">
                      {FIRST_DAY_OPTIONS.map(({ value: dayValue, labelKey }) => (
                        <Radio key={dayValue} value={String(dayValue)} label={weekDays[labelKey]} />
                      ))}
                    </Group>
                  </Radio.Group>
                )}
              </form.Field>
              <Divider my="xs" />
              <Title order={4}>{tGeneral("item.accessibility")}</Title>
              <form.Field name="pingIconsEnabled">
                {({ state, handleChange, handleBlur }) => (
                  <Switch
                    label={t("user.field.pingIconsEnabled.label")}
                    checked={state.value}
                    onChange={(e) => handleChange(e.currentTarget.checked)}
                    onBlur={handleBlur}
                    error={getErrorMessage(state.meta.errors)}
                  />
                )}
              </form.Field>
            </Stack>
          </Card>
        </SimpleGrid>

        <form.Subscribe
          selector={(state) => ({ hasChanges: !state.isDefaultValue, isSubmitting: state.isSubmitting, canSubmit: state.canSubmit })}
        >
          {({ hasChanges, isSubmitting, canSubmit }) => (
            <div style={{ position: "sticky", bottom: 20 }}>
              {hasChanges && (
                <Card withBorder>
                  <Group justify="space-between" wrap="wrap">
                    <Text fw={500}>{t("common.unsavedChanges")}</Text>
                    <Group>
                      <Button disabled={isSubmitting} variant="default" onClick={() => form.reset()}>
                        {t("common.action.discard")}
                      </Button>
                      <Button loading={isSubmitting} type="submit" disabled={!canSubmit}>
                        {t("common.action.saveChanges")}
                      </Button>
                    </Group>
                  </Group>
                </Card>
              )}
            </div>
          )}
        </form.Subscribe>
      </Stack>
    </form>
  );
};
