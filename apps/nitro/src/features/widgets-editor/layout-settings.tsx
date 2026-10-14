import { useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Fieldset,
  Group,
  Modal,
  NumberInput,
  Slider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";

import type { BoardEditorClient, BoardInputs, EditorTranslate, WidgetEditorDomain } from "./contracts";
import { issueMessages } from "./validation";

type Layout = BoardInputs["saveLayouts"]["layouts"][number];

export function LayoutSettings(props: {
  boardId: string;
  initialLayouts: BoardInputs["saveLayouts"]["layouts"];
  writer?: Pick<BoardEditorClient, "saveLayouts" | "resetLayout">;
  canModifyBoard: boolean;
  domain: WidgetEditorDomain;
  t: EditorTranslate;
  onSaved(layouts: Layout[]): void;
  onReset(layoutId: string): void;
  onEditLayout(layoutId: string): void;
}) {
  const { t } = props;
  const [layouts, setLayouts] = useState(() =>
    props.initialLayouts.map((layout) =>
      layout.role === "mobile" ? { ...layout, leftGutterColumnCount: 0, rightGutterColumnCount: 0 } : { ...layout },
    ),
  );
  const [baseline, setBaseline] = useState(layouts);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resetId, setResetId] = useState<string | null>(null);
  const lock = useRef(false);
  const dirty = JSON.stringify(layouts) !== JSON.stringify(baseline);
  const save = async (): Promise<Layout[] | null> => {
    if (lock.current || !props.canModifyBoard) return null;
    if (!props.writer) {
      setError(t("nitro.widgetEditor.boardWriterUnavailable"));
      return null;
    }
    const parsed = props.domain.boardSaveLayoutsSchema.safeParse({ id: props.boardId, layouts });
    if (!parsed.success) {
      setErrors(issueMessages(parsed.error.issues));
      return null;
    }
    if (!dirty) return baseline;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const canonical = await props.writer.saveLayouts(parsed.data);
      setLayouts(canonical);
      setBaseline(canonical);
      setErrors({});
      props.onSaved(canonical);
      return canonical;
    } catch {
      setError(t("nitro.widgetEditor.boardApplyFailedNoRetry"));
      return null;
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const editLayout = async (layout: Layout) => {
    const canonical = dirty || !baseline.some(({ id }) => id === layout.id) ? await save() : baseline;
    const match =
      canonical?.find((entry) => entry.id === layout.id) ??
      canonical?.find((entry) => entry.role === layout.role && entry.breakpoint === layout.breakpoint);
    if (match) props.onEditLayout(match.id);
  };
  const reset = async () => {
    if (!props.writer || !resetId || !props.canModifyBoard || lock.current) {
      if (!props.writer) setError(t("nitro.widgetEditor.boardWriterUnavailable"));
      return;
    }
    const id = resetId;
    if (!baseline.some((layout) => layout.id === id && layout.role !== "base")) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await props.writer.resetLayout({ boardId: props.boardId, layoutId: id });
      props.onReset(id);
      setResetId(null);
    } catch {
      setError(t("nitro.widgetEditor.boardApplyFailedNoRetry"));
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const change = (id: string, patch: Partial<Layout>) => {
    if (pending || !props.canModifyBoard) return;
    setLayouts((current) => current.map((layout) => (layout.id === id ? { ...layout, ...patch } : layout)));
  };
  const base = layouts.find((layout) => layout.role === "base");
  const sortedBreakpoints = layouts.map((layout) => layout.breakpoint).toSorted((left, right) => left - right);
  let largestGap: { start: number; end: number } | null = null;
  for (let index = 0; index < sortedBreakpoints.length - 1; index++) {
    const start = sortedBreakpoints[index];
    const end = sortedBreakpoints[index + 1];
    if (start === undefined || end === undefined || end - start <= 1) continue;
    if (!largestGap || end - start > largestGap.end - largestGap.start) largestGap = { start, end };
  }
  const nextBreakpoint = largestGap ? Math.floor((largestGap.start + largestGap.end) / 2) : null;
  const order = { base: 0, custom: 1, mobile: 2 };
  return (
    <Stack gap="lg">
      {!props.writer && <Alert color="yellow">{t("nitro.widgetEditor.boardWriterUnavailable")}</Alert>}
      {error && (
        <Alert color="red" role="alert">
          {error}
        </Alert>
      )}
      {Object.entries(errors).map(([path, message]) => (
        <Alert key={path} color="red">{`${path}: ${message}`}</Alert>
      ))}
      <Group justify="space-between">
        <Text fw={500}>{t("board.setting.section.layout.responsive.title")}</Text>
        <Button
          variant="light"
          disabled={!base || nextBreakpoint === null || pending || !props.canModifyBoard}
          onClick={() => {
            if (base && nextBreakpoint !== null)
              setLayouts((current) =>
                [
                  ...current,
                  {
                    ...base,
                    id: props.domain.createId(),
                    name: t("board.setting.section.layout.custom.defaultName"),
                    role: "custom" as const,
                    breakpoint: nextBreakpoint,
                  },
                ].toSorted((left, right) => left.breakpoint - right.breakpoint),
              );
          }}
        >
          {t("board.setting.section.layout.responsive.action.add")}
        </Button>
      </Group>
      {layouts
        .toSorted((left, right) => order[left.role] - order[right.role])
        .map((layout) => (
          <Fieldset
            key={layout.id}
            legend={
              <Group gap="xs">
                <Text>{layout.name}</Text>
                <Badge variant="default">{t(`board.setting.section.layout.role.${layout.role}`)}</Badge>
              </Group>
            }
          >
            <Stack gap="md">
              <TextInput
                label={t("common.field.name")}
                value={layout.name}
                disabled={pending || !props.canModifyBoard}
                onChange={(event) => change(layout.id, { name: event.currentTarget.value })}
              />
              <Text size="sm">{t("layout.field.columnCount.label")}</Text>
              <Slider
                aria-label={t("layout.field.columnCount.label")}
                min={1}
                max={24}
                step={1}
                value={layout.columnCount}
                marks={[1, 6, 12, 18, 24].map((value) => ({ value, label: String(value) }))}
                disabled={pending || !props.canModifyBoard}
                onChange={(columnCount) => {
                  const left = Math.min(layout.leftGutterColumnCount ?? 0, Math.max(0, columnCount - 1));
                  const right = Math.min(layout.rightGutterColumnCount ?? 0, Math.max(0, columnCount - left - 1));
                  change(layout.id, { columnCount, leftGutterColumnCount: left, rightGutterColumnCount: right });
                }}
              />
              <NumberInput
                label={t("layout.field.breakpoint.label")}
                min={layout.role === "mobile" ? 0 : 1}
                max={32767}
                allowDecimal={false}
                value={layout.breakpoint}
                disabled={layout.role === "mobile" || pending || !props.canModifyBoard}
                onChange={(breakpoint) => {
                  if (typeof breakpoint === "number") change(layout.id, { breakpoint });
                }}
              />
              {layout.role !== "mobile" && (
                <Group grow>
                  {(["leftGutterColumnCount", "rightGutterColumnCount"] as const).map((property) => (
                    <NumberInput
                      key={property}
                      label={t(`layout.field.${property}.label`)}
                      value={layout[property] ?? 0}
                      min={0}
                      max={Math.max(0, layout.columnCount - 1)}
                      allowDecimal={false}
                      disabled={pending || !props.canModifyBoard}
                      onChange={(value) => {
                        if (typeof value === "number") change(layout.id, { [property]: value });
                      }}
                    />
                  ))}
                </Group>
              )}
              <Group justify="flex-end">
                {layout.role === "custom" && (
                  <Button
                    variant="default"
                    disabled={pending || !props.canModifyBoard}
                    onClick={() => setLayouts((current) => current.filter(({ id }) => id !== layout.id))}
                  >
                    {t("common.action.remove")}
                  </Button>
                )}
                {layout.role !== "base" && (
                  <Button
                    variant="default"
                    disabled={pending || !baseline.some(({ id }) => id === layout.id) || !props.canModifyBoard}
                    onClick={() => setResetId(layout.id)}
                  >
                    {t("common.action.reset")}
                  </Button>
                )}
                <Button
                  variant="light"
                  disabled={pending || !props.canModifyBoard}
                  onClick={() => void editLayout(layout)}
                >
                  {t("common.action.edit")}
                </Button>
              </Group>
            </Stack>
          </Fieldset>
        ))}
      {dirty && (
        <Group justify="flex-end">
          <Button
            variant="default"
            disabled={pending}
            onClick={() => {
              setLayouts(baseline);
              setErrors({});
            }}
          >
            {t("common.action.discard")}
          </Button>
          <Button loading={pending} disabled={!props.canModifyBoard || !props.writer} onClick={() => void save()}>
            {t("common.action.saveChanges")}
          </Button>
        </Group>
      )}
      <Modal
        opened={resetId !== null}
        onClose={() => !pending && setResetId(null)}
        title={t("nitro.widgetEditor.resetLayoutTitle")}
        closeOnClickOutside={false}
        closeButtonProps={{ disabled: pending }}
      >
        <Stack>
          <Text>{t("nitro.widgetEditor.resetLayoutDescription")}</Text>
          <Group justify="flex-end">
            <Button variant="default" disabled={pending} onClick={() => setResetId(null)}>
              {t("common.action.cancel")}
            </Button>
            <Button color="red" loading={pending} onClick={() => void reset()}>
              {t("common.action.reset")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
