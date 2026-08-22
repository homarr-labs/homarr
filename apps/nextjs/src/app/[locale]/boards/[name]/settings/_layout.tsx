"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Fieldset,
  Grid,
  Group,
  Input,
  NumberInput,
  Paper,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
} from "@mantine/core";
import { IconEdit, IconRefresh } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import type { UseFormReturnType } from "@homarr/form";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { SectionCard } from "~/components/manage/section-card";
import type { Board } from "../../_types";
import { LayoutPreview } from "./_layout-preview";
import type { FormValues } from "./_settings-form";
import classes from "./_layout.module.css";

interface Props {
  board: Board;
  form: UseFormReturnType<FormValues>;
  isSaving: boolean;
  saveSettingsAsync: () => Promise<FormValues | null>;
}

export const LayoutSettingsContent = ({ board, form, isSaving, saveSettingsAsync }: Props) => {
  const tBoard = useI18n("board");
  const tLayout = useI18n("layout");
  const tCommon = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const { openConfirmModal } = useConfirmModal();
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [resettingLayoutId, setResettingLayoutId] = useState<string | null>(null);
  const { mutateAsync: resetLayout } = clientApi.board.resetLayout.useMutation({
    onError() {
      showErrorNotification({
        title: tCommon("notification.update.error"),
        message: tCommon("notification.update.error"),
      });
    },
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

  const openLayoutEditorAsync = async (layout: FormValues["layouts"][number]) => {
    setEditingLayoutId(layout.id);
    try {
      const persistedLayout = board.layouts.find((candidate) => candidate.id === layout.id);
      const savedValues = form.isDirty() || !persistedLayout ? await saveSettingsAsync() : form.values;
      const canonicalLayout = savedValues ? findCanonicalLayout(savedValues.layouts, layout) : undefined;
      if (!canonicalLayout) return;

      router.push(`/boards/${board.name}?layout=${encodeURIComponent(canonicalLayout.id)}&edit=true&returnTo=settings`);
    } finally {
      setEditingLayoutId(null);
    }
  };

  const confirmReset = (layout: FormValues["layouts"][number]) => {
    openConfirmModal({
      title: tBoard("setting.section.layout.reset.confirm.title", { layoutName: layout.name }),
      children: tBoard("setting.section.layout.reset.confirm.message"),
      confirmProps: { children: tBoard("setting.section.layout.reset.action"), color: "red" },
      onConfirm() {
        setResettingLayoutId(layout.id);
        void (async () => {
          try {
            const canonicalLayout = board.layouts.find((candidate) => candidate.id === layout.id);
            if (!canonicalLayout) return;

            await resetLayout({ boardId: board.id, layoutId: canonicalLayout.id });
            await utils.board.getBoardByName.invalidate({ name: board.name });
            router.refresh();
          } catch {
            // The mutation callback displays the error notification.
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
    <SectionCard title={tBoard("setting.section.layout.title")}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={2} maw="52rem">
            <Text fw={500}>{tBoard("setting.section.layout.responsive.title")}</Text>
            <Text size="sm">{tBoard("setting.section.layout.responsive.description")}</Text>
          </Stack>
          <Button
            type="button"
            variant="light"
            disabled={nextBreakpoint === null || !baseLayout}
            onClick={() => {
              if (nextBreakpoint === null || !baseLayout) return;
              form.setFieldValue("layouts", [
                ...form.values.layouts,
                {
                  id: createId(),
                  name: tBoard("setting.section.layout.custom.defaultName"),
                  columnCount: baseLayout.columnCount,
                  leftGutterColumnCount: baseLayout.leftGutterColumnCount,
                  rightGutterColumnCount: baseLayout.rightGutterColumnCount,
                  breakpoint: nextBreakpoint,
                  role: "custom",
                },
              ]);
            }}
          >
            {tBoard("setting.section.layout.responsive.action.add")}
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
                  <Text>{layout.name || tBoard(`setting.section.layout.role.${layout.role}` as never)}</Text>
                  <Badge size="sm" variant="default">
                    {tBoard(`setting.section.layout.role.${layout.role}` as never)}
                  </Badge>
                </Group>
              }
              bg="transparent"
            >
              <Grid gap={{ base: "lg", xl: "xl" }} align="flex-start">
                <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
                  <Stack gap="md">
                    <TextInput {...form.getInputProps(`layouts.${index}.name`)} label={tCommon("field.name")} />
                    <Input.Wrapper label={tLayout("field.columnCount.label")}>
                      <Slider
                        thumbLabel={`${tLayout("field.columnCount.label")} — ${layout.name}`}
                        mt="xs"
                        min={1}
                        max={24}
                        step={1}
                        marks={[1, 6, 12, 18, 24].map((value) => ({ value, label: String(value) }))}
                        styles={{
                          markLabel: { color: "light-dark(var(--mantine-color-black), var(--mantine-color-white))" },
                        }}
                        value={layout.columnCount}
                        onChange={(columnCount) => {
                          const left = Math.min(layout.leftGutterColumnCount, Math.max(0, columnCount - 1));
                          const right = Math.min(layout.rightGutterColumnCount, Math.max(0, columnCount - left - 1));
                          form.setFieldValue(`layouts.${index}.columnCount`, columnCount);
                          form.setFieldValue(`layouts.${index}.leftGutterColumnCount`, left);
                          form.setFieldValue(`layouts.${index}.rightGutterColumnCount`, right);
                        }}
                      />
                    </Input.Wrapper>
                    <NumberInput
                      {...form.getInputProps(`layouts.${index}.breakpoint`)}
                      label={tLayout("field.breakpoint.label")}
                      description={
                        layout.role === "mobile"
                          ? tBoard("setting.section.layout.mobile.breakpointDescription")
                          : tLayout("field.breakpoint.description")
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
                <Grid.Col span={{ base: 12, md: 6, lg: 4 }}>
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
                {layout.role !== "mobile" && (
                  <Grid.Col span={{ base: 12, lg: 4 }}>
                    <GutterSettings
                      left={layout.leftGutterColumnCount}
                      right={layout.rightGutterColumnCount}
                      columnCount={layout.columnCount}
                      onLeftChange={(value) => form.setFieldValue(`layouts.${index}.leftGutterColumnCount`, value)}
                      onRightChange={(value) => form.setFieldValue(`layouts.${index}.rightGutterColumnCount`, value)}
                    />
                  </Grid.Col>
                )}
              </Grid>

              <Group justify="space-between" mt="lg" gap="sm" wrap="wrap">
                <Group gap="xs">
                  {layout.role !== "base" && persistedLayout && (
                    <Button
                      type="button"
                      variant="default"
                      leftSection={<IconRefresh size={16} color="var(--mantine-color-red-5)" />}
                      loading={resettingLayoutId === layout.id}
                      disabled={isSaving}
                      onClick={() => confirmReset(layout)}
                    >
                      {tBoard("setting.section.layout.reset.action")}
                    </Button>
                  )}
                  {layout.role === "custom" && (
                    <Button
                      type="button"
                      variant="subtle"
                      color="red"
                      disabled={isSaving}
                      onClick={() => {
                        form.setFieldValue(
                          "layouts",
                          form.values.layouts.filter((candidate) => candidate.id !== layout.id),
                        );
                      }}
                    >
                      {tCommon("action.remove")}
                    </Button>
                  )}
                </Group>
                <Button
                  type="button"
                  variant="default"
                  leftSection={<IconEdit size={16} color="var(--mantine-color-red-5)" />}
                  loading={editingLayoutId === layout.id}
                  disabled={isSaving || !form.isValid()}
                  onClick={() => void openLayoutEditorAsync(layout)}
                >
                  {form.isDirty() || !persistedLayout
                    ? tBoard("setting.section.layout.edit.saveAndEdit")
                    : tBoard("setting.section.layout.edit.action")}
                </Button>
              </Group>
            </Fieldset>
          );
        })}
      </Stack>
    </SectionCard>
  );
};

const findCanonicalLayout = (layouts: FormValues["layouts"], layout: FormValues["layouts"][number]) =>
  layouts.find((candidate) => candidate.id === layout.id) ??
  layouts.find((candidate) => candidate.breakpoint === layout.breakpoint && candidate.role === layout.role);

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

interface GutterSettingsProps {
  left: number;
  right: number;
  columnCount: number;
  onLeftChange: (value: number) => void;
  onRightChange: (value: number) => void;
}

const gutterMarks = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
];

const GutterSettings = ({ left, right, columnCount, onLeftChange, onRightChange }: GutterSettingsProps) => {
  const t = useI18n("layout");
  const maxGutterWidth = Math.min(3, Math.max(1, columnCount - 1));

  return (
    <Paper className={classes.gutterSettings} p="md">
      <Stack gap="md">
        <Box>
          <Text fw={600}>{t("field.gutters.label")}</Text>
          <Text size="sm" c="dimmed">
            {t("field.gutters.description")}
          </Text>
        </Box>

        <GutterPreview left={left} right={right} columnCount={columnCount} />

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <GutterControl
              side="left"
              value={left}
              max={Math.min(maxGutterWidth, columnCount - right - 1)}
              onChange={onLeftChange}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <GutterControl
              side="right"
              value={right}
              max={Math.min(maxGutterWidth, columnCount - left - 1)}
              onChange={onRightChange}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Paper>
  );
};

const GutterControl = ({
  side,
  value,
  max,
  onChange,
}: {
  side: "left" | "right";
  value: number;
  max: number;
  onChange: (value: number) => void;
}) => {
  const t = useI18n("layout");
  const enabled = value > 0;

  return (
    <Stack gap="sm">
      <Switch
        checked={enabled}
        disabled={max < 1}
        onChange={(event) => onChange(event.currentTarget.checked ? Math.min(2, max) : 0)}
        label={t(`field.gutters.${side}.label` as never)}
      />
      {enabled && (
        <Input.Wrapper label={t("field.gutters.width.label")}>
          <Slider
            mt="xs"
            min={1}
            max={max}
            value={Math.min(value, max)}
            marks={gutterMarks.filter((mark) => mark.value <= max)}
            restrictToMarks
            thumbLabel={t(`field.gutters.${side}.thumbLabel` as never)}
            onChange={(nextValue) => onChange(Math.min(nextValue, max))}
          />
        </Input.Wrapper>
      )}
    </Stack>
  );
};

const GutterPreview = ({ left, right, columnCount }: { left: number; right: number; columnCount: number }) => {
  const t = useI18n("layout");
  const safeColumnCount = Math.max(1, columnCount);
  const main = Math.max(1, safeColumnCount - left - right);
  const tracks = [left > 0 ? `${left}fr` : null, `${main}fr`, right > 0 ? `${right}fr` : null]
    .filter((track) => track !== null)
    .join(" ");

  return (
    <Box
      className={classes.gutterPreview}
      aria-label={t("field.gutters.preview.label")}
      style={{ gridTemplateColumns: tracks }}
    >
      {left > 0 && <Box className={classes.previewGutter} data-side="left" />}
      <Box className={classes.previewCanvas}>
        <Box />
        <Box />
        <Box />
        <Box />
      </Box>
      {right > 0 && <Box className={classes.previewGutter} data-side="right" />}
    </Box>
  );
};
