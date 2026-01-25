"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Divider, Group, Radio, Select, SimpleGrid, Stack, Switch, Text, TextInput, Title } from "@mantine/core";
import type { DayOfWeek } from "@mantine/dates";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { env } from "@homarr/common/env";
import { useZodForm } from "@homarr/form";
import { useConfirmModal } from "@homarr/modals";
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

const anchorSelector = "a[href]:not([target='_blank'])";

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

const valuesEqual = (a: unknown, b: unknown) => a === b;

export const UserGeneralSettingsForm = ({
  user,
  boardsData,
  searchEnginesData,
  showLanguageSelector = false,
}: UserGeneralSettingsFormProps) => {
  const t = useI18n();
  const tGeneral = useScopedI18n("management.page.user.setting.general");
  const { openConfirmModal } = useConfirmModal();
  const router = useRouter();

  const isCredentialsUser = user.provider === "credentials";

  const [savedValues, setSavedValues] = useState<FormValues>(() => buildInitialValues(user));
  const form = useZodForm(userGeneralSettingsSchema, { initialValues: savedValues });
  const allowLeaveRef = useRef(false);
  const confirmOpenRef = useRef(false);

  const editProfileMutation = clientApi.user.editProfile.useMutation();
  const changeHomeBoardsMutation = clientApi.user.changeHomeBoards.useMutation();
  const changeSearchPreferencesMutation = clientApi.user.changeSearchPreferences.useMutation();
  const changeFirstDayOfWeekMutation = clientApi.user.changeFirstDayOfWeek.useMutation();
  const changePingIconsEnabledMutation = clientApi.user.changePingIconsEnabled.useMutation();

  const isPending =
    editProfileMutation.isPending ||
    changeHomeBoardsMutation.isPending ||
    changeSearchPreferencesMutation.isPending ||
    changeFirstDayOfWeekMutation.isPending ||
    changePingIconsEnabledMutation.isPending;

  const weekDays = useMemo(() => dayjs.weekdays(false), []);

  useEffect(() => {
    if (!form.isDirty() || allowLeaveRef.current) return;

    const handleClick = (event: Event) => {
      if (allowLeaveRef.current) return;

      const target = (event.target as HTMLElement).closest("a");

      if (!target) return;

      event.preventDefault();

      if (confirmOpenRef.current) return;
      confirmOpenRef.current = true;

      openConfirmModal({
        title: t("common.unsavedChanges"),
        children: t("common.unsavedChanges"),
        confirmProps: {
          children: t("common.action.discard"),
        },
        onCancel() {
          confirmOpenRef.current = false;
        },
        onConfirm() {
          allowLeaveRef.current = true;
          confirmOpenRef.current = false;
          router.push(target.href);
        },
      });
    };

    const handlePopState = (event: Event) => {
      if (allowLeaveRef.current) return;

      // Keep the user on this page and ask for confirmation.
      window.history.pushState(null, document.title, window.location.href);
      event.preventDefault();

      if (confirmOpenRef.current) return;
      confirmOpenRef.current = true;

      openConfirmModal({
        title: t("common.unsavedChanges"),
        children: t("common.unsavedChanges"),
        confirmProps: {
          children: t("common.action.discard"),
        },
        onCancel() {
          confirmOpenRef.current = false;
        },
        onConfirm() {
          allowLeaveRef.current = true;
          confirmOpenRef.current = false;
          window.history.back();
        },
      });
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (env.NODE_ENV === "development") return; // Allow to reload in development

      event.preventDefault();
      event.returnValue = true;
    };

    // Add a history entry so back triggers popstate for this page first.
    window.history.pushState(null, document.title, window.location.href);

    const anchors = document.querySelectorAll(anchorSelector);
    anchors.forEach((link) => link.addEventListener("click", handleClick));
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      anchors.forEach((link) => link.removeEventListener("click", handleClick));
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [form, openConfirmModal, router, t]);

  const handleSave = useCallback(async () => {
    const values = form.getValues() as FormValues;

    const tasks: Array<{ key: keyof FormValues | "profile"; run: () => Promise<unknown> }> = [];

    const profileChanged =
      !valuesEqual(values.name, savedValues.name) || !valuesEqual(values.email ?? "", savedValues.email ?? "");
    if (isCredentialsUser && profileChanged) {
      tasks.push({
        key: "profile",
        run: () =>
          editProfileMutation.mutateAsync({
            id: user.id,
            name: values.name,
            email: values.email ?? "",
          }),
      });
    }

    const boardsChanged =
      !valuesEqual(values.homeBoardId, savedValues.homeBoardId) ||
      !valuesEqual(values.mobileHomeBoardId, savedValues.mobileHomeBoardId);
    if (boardsChanged) {
      tasks.push({
        key: "homeBoardId",
        run: () =>
          changeHomeBoardsMutation.mutateAsync({
            userId: user.id,
            homeBoardId: values.homeBoardId,
            mobileHomeBoardId: values.mobileHomeBoardId,
          }),
      });
    }

    const searchChanged =
      !valuesEqual(values.defaultSearchEngineId, savedValues.defaultSearchEngineId) ||
      !valuesEqual(values.openInNewTab, savedValues.openInNewTab);
    if (searchChanged) {
      tasks.push({
        key: "defaultSearchEngineId",
        run: () =>
          changeSearchPreferencesMutation.mutateAsync({
            userId: user.id,
            defaultSearchEngineId: values.defaultSearchEngineId,
            openInNewTab: values.openInNewTab,
          }),
      });
    }

    const firstDayChanged = !valuesEqual(values.firstDayOfWeek, savedValues.firstDayOfWeek);
    if (firstDayChanged) {
      tasks.push({
        key: "firstDayOfWeek",
        run: () =>
          changeFirstDayOfWeekMutation.mutateAsync({
            id: user.id,
            firstDayOfWeek: values.firstDayOfWeek,
          }),
      });
    }

    const pingChanged = !valuesEqual(values.pingIconsEnabled, savedValues.pingIconsEnabled);
    if (pingChanged) {
      tasks.push({
        key: "pingIconsEnabled",
        run: () =>
          changePingIconsEnabledMutation.mutateAsync({
            id: user.id,
            pingIconsEnabled: values.pingIconsEnabled,
          }),
      });
    }

    if (tasks.length === 0) return;

    const results = await Promise.allSettled(tasks.map((t) => t.run()));

    const hasError = results.some((r) => r.status === "rejected");

    const nextSaved: FormValues = {
      ...savedValues,
    };

    if (!hasError) {
      nextSaved.name = values.name;
      nextSaved.email = values.email ?? "";
      nextSaved.homeBoardId = values.homeBoardId;
      nextSaved.mobileHomeBoardId = values.mobileHomeBoardId;
      nextSaved.defaultSearchEngineId = values.defaultSearchEngineId;
      nextSaved.openInNewTab = values.openInNewTab;
      nextSaved.firstDayOfWeek = values.firstDayOfWeek;
      nextSaved.pingIconsEnabled = values.pingIconsEnabled;
    } else {
      results.forEach((r, index) => {
        if (r.status === "rejected") return;
        const task = tasks[index];
        if (!task) return;
        if (task.key === "profile") {
          nextSaved.name = values.name;
          nextSaved.email = values.email ?? "";
        }
        if (task.key === "homeBoardId") {
          nextSaved.homeBoardId = values.homeBoardId;
          nextSaved.mobileHomeBoardId = values.mobileHomeBoardId;
        }
        if (task.key === "defaultSearchEngineId") {
          nextSaved.defaultSearchEngineId = values.defaultSearchEngineId;
          nextSaved.openInNewTab = values.openInNewTab;
        }
        if (task.key === "firstDayOfWeek") {
          nextSaved.firstDayOfWeek = values.firstDayOfWeek;
        }
        if (task.key === "pingIconsEnabled") {
          nextSaved.pingIconsEnabled = values.pingIconsEnabled;
        }
      });
    }

    setSavedValues(nextSaved);
    form.setInitialValues(nextSaved);

    await revalidatePathActionAsync(`/manage/users/${user.id}`);

    if (hasError) {
      showErrorNotification({
        title: t("common.notification.update.error"),
        message: t("common.notification.update.error"),
      });
      return;
    }

    showSuccessNotification({
      title: t("common.notification.update.success"),
      message: t("common.notification.update.success"),
    });
  }, [
    changeFirstDayOfWeekMutation,
    changeHomeBoardsMutation,
    changePingIconsEnabledMutation,
    changeSearchPreferencesMutation,
    editProfileMutation,
    form,
    isCredentialsUser,
    savedValues,
    t,
    user.id,
  ]);

  const handleDiscard = useCallback(() => {
    form.reset();
  }, [form]);

  const firstDayInputProps = form.getInputProps("firstDayOfWeek");
  const onFirstDayChange = firstDayInputProps.onChange as (value: number) => void;
  const firstDayValue = (firstDayInputProps.value as number).toString();

  return (
    <form onSubmit={form.onSubmit(() => handleSave())}>
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" verticalSpacing="lg">
          <Card withBorder>
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{t("user.name")}</Title>
                <Text c="dimmed" size="sm">
                  {t("user.field.username.label")} · {t("user.field.email.label")}
                </Text>
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
              <TextInput disabled={!isCredentialsUser} label={t("user.field.email.label")} {...form.getInputProps("email")} />
            </Stack>
          </Card>

          <Card withBorder>
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

          <Card withBorder>
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
              <Switch label={t("user.field.openSearchInNewTab.label")} {...form.getInputProps("openInNewTab", { type: "checkbox" })} />
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="md">
              <Stack gap={2}>
                <Title order={3}>{tGeneral("item.language")}</Title>
              </Stack>
              <Divider />
              {showLanguageSelector && <CurrentLanguageCombobox />}
              <Title order={4}>{tGeneral("item.firstDayOfWeek")}</Title>
              <Radio.Group {...firstDayInputProps} value={firstDayValue} onChange={(value) => onFirstDayChange(parseInt(value))}>
                <Group mt="xs" wrap="wrap">
                  <Radio value="1" label={weekDays[1]} />
                  <Radio value="6" label={weekDays[6]} />
                  <Radio value="0" label={weekDays[0]} />
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
                  <Button loading={isPending} type="submit">
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

