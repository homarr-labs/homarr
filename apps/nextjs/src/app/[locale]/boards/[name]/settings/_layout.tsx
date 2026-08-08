"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Fieldset,
  Grid,
  Group,
  Input,
  NumberInput,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconEdit, IconRefresh } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import { useZodForm } from "@homarr/form";
import { useConfirmModal } from "@homarr/modals";
import { useI18n } from "@homarr/translation/client";
import { boardSaveLayoutsSchema } from "@homarr/validation/board";

import type { Board } from "../../_types";
import { LayoutPreview } from "./_layout-preview";

interface Props {
  board: Board;
}

export const LayoutSettingsContent = ({ board }: Props) => {
  const t = useI18n();
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { openConfirmModal } = useConfirmModal();
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [resettingLayoutId, setResettingLayoutId] = useState<string | null>(null);
  const { mutateAsync: saveLayouts, isPending: isSaving } = clientApi.board.saveLayouts.useMutation({
    onSettled() {
      void utils.board.getBoardByName.invalidate({ name: board.name });
      void utils.board.getHomeBoard.invalidate();
    },
  });
  const { mutateAsync: resetLayout } = clientApi.board.resetLayout.useMutation();
  const form = useZodForm(boardSaveLayoutsSchema.omit({ id: true }).required(), {
    initialValues: { layouts: board.layouts },
  });
  const appIds = useMemo(
    () =>
      Array.from(
        new Set(
          board.items.flatMap((item) =>
            item.kind === "app" && typeof item.options.appId === "string" ? [item.options.appId] : [],
          ),
        ),
      ),
    [board.items],
  );
  const { data: apps = [] } = clientApi.app.byIds.useQuery(appIds, { enabled: appIds.length > 0 });

  const persistLayoutsAsync = async () => {
    const savedLayouts = await saveLayouts({ id: board.id, layouts: form.values.layouts });
    form.setValues({ layouts: savedLayouts });
    form.resetDirty({ layouts: savedLayouts });
    return savedLayouts;
  };

  const openLayoutEditorAsync = async (layout: (typeof form.values.layouts)[number]) => {
    setEditingLayoutId(layout.id);
    try {
      const isNew = !board.layouts.some((candidate) => candidate.id === layout.id);
      const savedLayouts = form.isDirty() || isNew ? await persistLayoutsAsync() : form.values.layouts;
      const canonicalLayout =
        savedLayouts.find((candidate) => candidate.id === layout.id) ??
        savedLayouts.find((candidate) => candidate.breakpoint === layout.breakpoint && candidate.role === layout.role);
      if (!canonicalLayout) return;

      router.push(`/boards/${board.name}?layout=${encodeURIComponent(canonicalLayout.id)}&edit=true&returnTo=settings`);
    } finally {
      setEditingLayoutId(null);
    }
  };

  const confirmReset = (layout: (typeof form.values.layouts)[number]) => {
    openConfirmModal({
      title: t("board.setting.section.layout.reset.confirm.title", { layoutName: layout.name }),
      children: t("board.setting.section.layout.reset.confirm.message"),
      confirmProps: { children: t("board.setting.section.layout.reset.action"), color: "red" },
      onConfirm() {
        setResettingLayoutId(layout.id);
        void (async () => {
          try {
            const savedLayouts = form.isDirty() ? await persistLayoutsAsync() : form.values.layouts;
            const canonicalLayout =
              savedLayouts.find((candidate) => candidate.id === layout.id) ??
              savedLayouts.find(
                (candidate) => candidate.breakpoint === layout.breakpoint && candidate.role === layout.role,
              );
            if (!canonicalLayout) return;

            await resetLayout({ boardId: board.id, layoutId: canonicalLayout.id });
            await utils.board.getBoardByName.invalidate({ name: board.name });
            router.refresh();
          } finally {
            setResettingLayoutId(null);
          }
        })();
      },
    });
  };

  const nextBreakpoint = getNextCustomBreakpoint(form.values.layouts);
  const baseLayout = form.values.layouts.find((layout) => layout.role === "base");
  const sortedLayouts = form.values.layouts
    .map((layout, index) => ({ layout, index }))
    .toSorted((entryA, entryB) => entryA.layout.breakpoint - entryB.layout.breakpoint);

  return (
    <form
      onSubmit={form.onSubmit(async () => {
        await persistLayoutsAsync();
      })}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text fw={500}>{t("board.setting.section.layout.responsive.title")}</Text>
            <Text size="sm">{t("board.setting.section.layout.responsive.description")}</Text>
          </Stack>
          <Button
            variant="subtle"
            disabled={nextBreakpoint === null || !baseLayout}
            onClick={() => {
              if (nextBreakpoint === null || !baseLayout) return;
              form.setFieldValue("layouts", [
                ...form.values.layouts,
                {
                  id: createId(),
                  name: t("board.setting.section.layout.custom.defaultName"),
                  columnCount: baseLayout.columnCount,
                  breakpoint: nextBreakpoint,
                  role: "custom",
                },
              ]);
            }}
          >
            {t("board.setting.section.layout.responsive.action.add")}
          </Button>
        </Group>

        {sortedLayouts.map(({ layout, index }) => {
          const persistedLayout = board.layouts.find((candidate) => candidate.id === layout.id);
          const sourceLayout = persistedLayout ?? board.layouts.find((candidate) => candidate.role === "base");
          const customBreakpoints = form.values.layouts
            .filter((candidate) => candidate.role === "custom" && candidate.id !== layout.id)
            .map((candidate) => candidate.breakpoint);
          const baseBreakpoint = form.values.layouts.find((candidate) => candidate.role === "base")?.breakpoint ?? 768;

          return (
            <Fieldset
              key={layout.id}
              legend={
                <Group gap="xs">
                  <Text>{layout.name || t(`board.setting.section.layout.role.${layout.role}`)}</Text>
                  <Badge size="sm" variant="default">
                    {t(`board.setting.section.layout.role.${layout.role}`)}
                  </Badge>
                </Group>
              }
              bg="transparent"
            >
              <Grid gap="xl" align="flex-start">
                <Grid.Col span={{ base: 12, lg: 5 }}>
                  <Stack gap="md">
                    <TextInput {...form.getInputProps(`layouts.${index}.name`)} label={t("layout.field.name.label")} />
                    <Input.Wrapper label={t("layout.field.columnCount.label")}>
                      <Slider
                        thumbLabel={`${t("layout.field.columnCount.label")} — ${layout.name}`}
                        mt="xs"
                        min={1}
                        max={24}
                        step={1}
                        marks={[1, 6, 12, 18, 24].map((value) => ({ value, label: String(value) }))}
                        styles={{
                          markLabel: { color: "light-dark(var(--mantine-color-black), var(--mantine-color-white))" },
                        }}
                        {...form.getInputProps(`layouts.${index}.columnCount`)}
                      />
                    </Input.Wrapper>
                    <NumberInput
                      {...form.getInputProps(`layouts.${index}.breakpoint`)}
                      label={t("layout.field.breakpoint.label")}
                      description={
                        layout.role === "mobile"
                          ? t("board.setting.section.layout.mobile.breakpointDescription")
                          : t("layout.field.breakpoint.description")
                      }
                      disabled={layout.role === "mobile"}
                      styles={{ description: { color: "var(--mantine-color-text)" } }}
                      min={
                        layout.role === "base"
                          ? Math.max(1, ...customBreakpoints.map((breakpoint) => breakpoint + 1))
                          : 1
                      }
                      max={layout.role === "custom" ? baseBreakpoint - 1 : 32767}
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={{ base: 12, lg: 7 }}>
                  {sourceLayout && (
                    <LayoutPreview
                      board={board}
                      layout={layout}
                      layouts={form.values.layouts}
                      sourceLayout={sourceLayout}
                      apps={apps}
                    />
                  )}
                </Grid.Col>
              </Grid>

              <Group justify="space-between" mt="md">
                <Group gap="xs">
                  {layout.role !== "base" && persistedLayout && (
                    <Button
                      variant="filled"
                      color="dark"
                      leftSection={<IconRefresh size={16} color="var(--mantine-color-red-5)" />}
                      loading={resettingLayoutId === layout.id}
                      onClick={() => confirmReset(layout)}
                    >
                      {t("board.setting.section.layout.reset.action")}
                    </Button>
                  )}
                  {layout.role === "custom" && (
                    <Button
                      variant="subtle"
                      color="red"
                      onClick={() => {
                        form.setFieldValue(
                          "layouts",
                          form.values.layouts.filter((candidate) => candidate.id !== layout.id),
                        );
                      }}
                    >
                      {t("common.action.remove")}
                    </Button>
                  )}
                </Group>
                <Button
                  variant="default"
                  leftSection={<IconEdit size={16} color="var(--mantine-color-red-5)" />}
                  loading={editingLayoutId === layout.id}
                  onClick={() => void openLayoutEditorAsync(layout)}
                >
                  {form.isDirty() || !persistedLayout
                    ? t("board.setting.section.layout.edit.saveAndEdit")
                    : t("board.setting.section.layout.edit.action")}
                </Button>
              </Group>
            </Fieldset>
          );
        })}

        <Group justify="end">
          <Button type="submit" loading={isSaving}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const getNextCustomBreakpoint = (layouts: Array<{ breakpoint: number }>) => {
  const sortedBreakpoints = layouts
    .map((layout) => layout.breakpoint)
    .toSorted((breakpointA, breakpointB) => breakpointA - breakpointB);
  let largestGap: { start: number; end: number } | null = null;

  for (let index = 0; index < sortedBreakpoints.length - 1; index++) {
    const start = sortedBreakpoints[index];
    const end = sortedBreakpoints[index + 1];
    if (start === undefined || end === undefined || end - start <= 1) continue;
    if (!largestGap || end - start > largestGap.end - largestGap.start) largestGap = { start, end };
  }

  return largestGap ? Math.floor((largestGap.start + largestGap.end) / 2) : null;
};
