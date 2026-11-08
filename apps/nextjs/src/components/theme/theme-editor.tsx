"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  ColorInput,
  CopyButton,
  DEFAULT_THEME,
  Grid,
  Group,
  mergeMantineTheme,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  useComputedColorScheme,
} from "@mantine/core";
import { IconArrowBackUp, IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { isRecord } from "@homarr/common";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { ThemeSelect } from "@homarr/ui/theme-select";
import { getThemePalette } from "@homarr/ui/themes";
import type { CustomTheme } from "@homarr/validation/theme";
import { customThemeMaxLength, customThemeSchema, resolveThemeSelection } from "@homarr/validation/theme";
import type { ThemeControl } from "@homarr/validation/theme-controls";
import {
  getThemeControlValue,
  themeControlGroups,
  themeControls,
  updateThemeDraft,
} from "@homarr/validation/theme-controls";

import { useUnsavedChangesGuard } from "~/components/manage/use-unsaved-changes-guard";
import type { ThemeSelection } from "~/theme/branding";
import { createAppearanceTheme, resolveActiveTheme } from "~/theme/branding";
import type { ThemePreviewMessage } from "./theme-preview-context";
import { ThemePreviewFrame } from "./theme-preview-frame";
import { ThemeLengthInput } from "./theme-length-input";
import { ThemeLayoutControls } from "./theme-layout-controls";

type ThemeData = RouterOutputs["theme"]["get"];

const documentFor = (branding: ThemeData["branding"], selection: ThemeSelection): CustomTheme => {
  return resolveThemeSelection(branding, selection).document;
};

export const ThemeEditor = ({
  initialData,
  boards,
  returnHref,
}: {
  initialData: ThemeData;
  boards: { name: string }[];
  returnHref: string;
}) => {
  const t = useI18n("common.customTheme");
  const common = useI18n("common");
  const router = useRouter();
  const utils = clientApi.useUtils();
  const queryInput = useMemo(
    () => ({ target: initialData.target, userId: initialData.userId }),
    [initialData.target, initialData.userId],
  );
  const query = clientApi.theme.get.useQuery(queryInput, { initialData });
  const data = query.data;
  const [selection, setSelection] = useState<ThemeSelection>({
    themeId: initialData.themeId,
    customTheme: initialData.customTheme,
  });
  const [saved, setSaved] = useState(selection);
  const [previewSelection, setPreviewSelection] = useState(selection);
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [panel, setPanel] = useState<string | null>("layout");
  const [search, setSearch] = useState("");
  const [component, setComponent] = useState<string | null>("Card");
  const [editingControl, setEditingControl] = useState<{ path: string; value: string | number } | null>(null);
  const [surface, setSurface] = useState<ThemePreviewMessage["surface"]>("board");
  const appScheme = useComputedColorScheme("dark");
  const [schemeOverride, setSchemeOverride] = useState<"light" | "dark" | null>(null);
  const scheme = schemeOverride ?? appScheme;
  const [width, setWidth] = useState<string | null>("100%");
  const [boardName, setBoardName] = useState<string | null>(boards[0]?.name ?? null);
  const [includeCustomCss, setIncludeCustomCss] = useState(false);
  const draftRevision = useRef(0);
  const mutation = clientApi.theme.update.useMutation();
  const dirty = JSON.stringify(selection) !== JSON.stringify(saved);
  useUnsavedChangesGuard(dirty || Boolean(jsonError));
  const serverKey = JSON.stringify([data.themeId, data.customTheme]);
  const previousServerKey = useRef(serverKey);
  const incomingKey = JSON.stringify([initialData.themeId, initialData.customTheme, initialData.branding]);
  const previousIncomingKey = useRef<string | null>(null);

  useEffect(() => {
    if (previousIncomingKey.current === incomingKey) return;
    previousIncomingKey.current = incomingKey;
    // Router refreshes (including Cmd+K) supply fresh props; initialData never updates an existing query.
    utils.theme.get.setData(queryInput, initialData);
  }, [incomingKey, initialData, queryInput, utils]);

  useEffect(() => {
    if (previousServerKey.current === serverKey) return;
    previousServerKey.current = serverKey;
    const next = { themeId: data.themeId, customTheme: data.customTheme };
    setSaved(next);
    if (!dirty && !jsonError) {
      setSelection(next);
      setPreviewSelection(next);
      setJsonText(null);
    }
  }, [serverKey, data.themeId, data.customTheme, dirty, jsonError]);

  const document = documentFor(data.branding, selection);
  const parsed = customThemeSchema.safeParse(document);
  const error = parsed.error?.issues[0];
  let validationMessage = jsonError;
  if (!validationMessage && error) validationMessage = `${error.path.join(".")}: ${error.message}`;
  const appearance = useMemo(
    () => createAppearanceTheme(data.branding, previewSelection),
    [data.branding, previewSelection],
  );
  const effective = useMemo(() => mergeMantineTheme(DEFAULT_THEME, appearance.theme), [appearance.theme]);
  const active = resolveActiveTheme(data.branding, previewSelection);
  const inheritedDocument = useMemo(() => {
    return {
      theme: effective,
      light: {
        body: effective.white,
        surface: effective.white,
        hover: effective.colors.gray[0],
        border: effective.colors.gray[4],
        text: effective.black,
        dimmed: effective.colors.gray[6],
        primary: data.branding.primaryColor,
        secondary: data.branding.secondaryColor,
        ...getThemePalette(active.preset, "light", active.customTheme),
      },
      dark: {
        body: effective.colors.dark[7],
        surface: effective.colors.dark[6],
        hover: effective.colors.dark[5],
        border: effective.colors.dark[4],
        text: effective.colors.dark[0],
        dimmed: effective.colors.dark[2],
        primary: data.branding.primaryColor,
        secondary: data.branding.secondaryColor,
        ...getThemePalette(active.preset, "dark", active.customTheme),
      },
    };
  }, [effective, active.preset, active.customTheme, data.branding]);

  const updateSelection = (next: ThemeSelection) => {
    draftRevision.current += 1;
    setSelection(next);
    setJsonText(null);
    setJsonError(null);
    const result = customThemeSchema.safeParse(documentFor(data.branding, next));
    if (result.success) {
      let customTheme = next.customTheme;
      if (next.themeId === "custom") customTheme = result.data;
      setPreviewSelection({ ...next, customTheme });
    }
  };

  const updateControls = (changes: { path: string; value: string | number | boolean | null }[]) => {
    setEditingControl(null);
    const next = updateThemeDraft(document, changes);
    updateSelection({ themeId: "custom", customTheme: next });
  };

  const updateControl = (path: string, value: string | number | boolean | null) => {
    const next = updateThemeDraft(document, [{ path, value }]);
    updateSelection({ themeId: "custom", customTheme: next });
  };

  const save = async (next = selection) => {
    if (mutation.isPending) return;
    const submittedRevision = draftRevision.current;
    try {
      const result = await mutation.mutateAsync({ target: data.target, userId: data.userId, ...next });
      const savedSelection = { themeId: result.themeId, customTheme: result.customTheme };
      setSaved(savedSelection);
      if (draftRevision.current === submittedRevision) updateSelection(savedSelection);
      await revalidatePathActionAsync(returnHref);
      await query.refetch();
      router.refresh();
      showSuccessNotification({ message: common("notification.update.success") });
    } catch {
      showErrorNotification({ message: common("notification.update.error") });
    }
  };

  const updateJson = (value: string) => {
    draftRevision.current += 1;
    setJsonText(value);
    if (value.length > customThemeMaxLength) {
      setJsonError(t("editor.tooLong"));
      return;
    }
    try {
      let json: unknown = JSON.parse(value);
      if (isRecord(json) && !Object.hasOwn(json, "preset") && !Object.hasOwn(json, "theme"))
        json = { preset: document.preset, theme: json };
      const result = customThemeSchema.safeParse(json);
      if (!result.success) {
        const issue = result.error.issues[0];
        setJsonError(`${issue?.path.join(".")}: ${issue?.message}`);
        return;
      }
      setJsonError(null);
      setSelection({ themeId: "custom", customTheme: result.data });
      setPreviewSelection({ themeId: "custom", customTheme: result.data });
    } catch {
      setJsonError(t("editor.invalidJson"));
    }
  };

  const renderControl = (control: ThemeControl) => {
    const own = getThemeControlValue(document, control.path);
    const value = own ?? getThemeControlValue(inheritedDocument, control.path) ?? control.defaultValue;
    let textValue = String(value ?? "");
    if (own === undefined) textValue = textValue.replace(/^calc\(([-\d.]+\w+) \* var\(--mantine-scale\)\)$/u, "$1");
    let label = t(`studio.controls.${control.labelKey}` as never);
    if (control.component) label = `${control.component} · ${label}`;
    if (control.suffix && !["light", "dark"].includes(control.suffix)) label = `${label} ${control.suffix}`;
    const locked =
      data.branding.lockPrimaryColor &&
      (/^(light|dark)\.primary$/u.test(control.path) || control.path.startsWith("theme.primaryShade"));
    const disabled = locked || Boolean(jsonError);
    const baseProps = { label, name: control.path, "aria-label": label, disabled };
    const shared = {
      ...baseProps,
      styles: { wrapper: { marginTop: 0, marginBottom: 0 } },
    };
    const reset = (
      <ActionIcon
        size="input-sm"
        variant="subtle"
        disabled={own === undefined || disabled}
        aria-label={t("studio.resetControl", { control: label })}
        title={t("studio.resetControl", { control: label })}
        onClick={() => {
          setEditingControl(null);
          updateControl(control.path, null);
        }}
      >
        <IconArrowBackUp size={16} />
      </ActionIcon>
    );
    let inputMarginTop = 0;
    if (control.labelKey === "breakpoint") inputMarginTop = 5;
    const inputContainer = (children: ReactNode) => (
      <Group gap="xs" wrap="nowrap" align="center" mt={inputMarginTop}>
        <Box flex={1} miw={0}>
          {children}
        </Box>
        {reset}
      </Group>
    );
    let editingValue: string | number | undefined;
    if (editingControl?.path === control.path) editingValue = editingControl.value;
    const editingProps = {
      onFocus: () => {
        let current: string | number = textValue;
        if (control.type === "number") {
          current = "";
          if (typeof value === "number") current = value;
        }
        setEditingControl({ path: control.path, value: current });
      },
      onBlur: () => setEditingControl(null),
    };
    const updateText = (next: string) => {
      setEditingControl({ path: control.path, value: next });
      updateControl(control.path, next || null);
    };
    let input;
    if (control.type === "number") {
      let number: number | string = "";
      if (typeof value === "number") number = value;
      input = (
        <NumberInput
          {...shared}
          {...editingProps}
          inputContainer={inputContainer}
          min={control.min}
          max={control.max}
          step={control.step ?? 1}
          value={editingValue ?? number}
          onChange={(next) => {
            setEditingControl({ path: control.path, value: next });
            let stored: number | null = null;
            if (typeof next === "number") stored = next;
            updateControl(control.path, stored);
          }}
        />
      );
    } else if (control.type === "boolean") {
      input = inputContainer(
        <Switch
          {...baseProps}
          checked={value === true}
          onChange={(event) => updateControl(control.path, event.currentTarget.checked)}
        />,
      );
    } else if (control.type === "select") {
      input = (
        <Select
          {...shared}
          inputContainer={inputContainer}
          data={control.options}
          value={textValue}
          allowDeselect={false}
          onChange={(next) => updateControl(control.path, next)}
        />
      );
    } else if (control.type === "color") {
      input = (
        <ColorInput
          {...shared}
          {...editingProps}
          inputContainer={inputContainer}
          format="hex"
          maxLength={300}
          value={String(editingValue ?? textValue)}
          eyeDropperButtonProps={{ "aria-label": t("editor.pickColor", { color: label }) }}
          onChange={updateText}
        />
      );
    } else if (control.type === "length") {
      input = (
        <ThemeLengthInput
          {...shared}
          {...editingProps}
          inputContainer={inputContainer}
          value={String(editingValue ?? textValue)}
          unit={control.unit}
          options={control.options}
          description={control.labelKey === "breakpoint" ? t("studio.breakpointHint") : undefined}
          onChange={updateText}
        />
      );
    } else {
      input = (
        <TextInput
          {...shared}
          {...editingProps}
          inputContainer={inputContainer}
          value={editingValue ?? textValue}
          placeholder={t("studio.inheritedValue")}
          maxLength={300}
          description={control.labelKey === "breakpoint" ? t("studio.breakpointHint") : undefined}
          onChange={(event) => updateText(event.currentTarget.value)}
        />
      );
    }
    return (
      <Box key={control.path} data-theme-control={control.path}>
        {input}
      </Box>
    );
  };

  const visibleControls = themeControls.filter((control) => {
    if (
      control.group === "colors" &&
      control.suffix &&
      ["light", "dark"].includes(control.suffix) &&
      control.suffix !== scheme
    )
      return false;
    if (control.group === "surfaces" && control.component && control.component !== component && !search) return false;
    return `${control.label} ${control.path}`.toLowerCase().includes(search.trim().toLowerCase());
  });
  const message: ThemePreviewMessage = {
    type: "homarr-theme-preview",
    branding: data.branding,
    ...previewSelection,
    scheme,
    surface,
    includeCustomCss,
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group>
          <Button component={Link} href={returnHref} variant="subtle" leftSection={<IconArrowLeft size={16} />}>
            {common("action.backToOverview")}
          </Button>
          <Badge variant="light">{t(data.target === "server" ? "studio.serverTheme" : "studio.userTheme")}</Badge>
          {selection.themeId === null && (
            <Text size="sm" c="dimmed">
              {t("studio.inheritingServer")}
            </Text>
          )}
        </Group>
        <Group>
          {data.target === "user" && (
            <Button
              variant="default"
              disabled={mutation.isPending || (saved.themeId === null && !dirty)}
              onClick={() => void save({ themeId: null, customTheme: saved.customTheme })}
            >
              {t("studio.useServer")}
            </Button>
          )}
          <Button variant="default" disabled={!dirty && !jsonError} onClick={() => updateSelection(saved)}>
            {common("action.discard")}
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            loading={mutation.isPending}
            disabled={!dirty || Boolean(validationMessage)}
            onClick={() => void save()}
          >
            {t("studio.saveTheme")}
          </Button>
        </Group>
      </Group>
      <Text size="sm" c="dimmed">
        {t("studio.description")}
      </Text>
      {validationMessage && (
        <Alert color="red" role="alert">
          {validationMessage}
        </Alert>
      )}
      <Grid gap="lg" align="start">
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Paper withBorder p="md">
            <Stack>
              <ThemeSelect
                value={selection.themeId}
                inherit={data.target === "user"}
                hasCustomTheme={Boolean(selection.customTheme)}
                onChange={(themeId) => {
                  let customTheme = selection.customTheme;
                  if (!customThemeSchema.safeParse(customTheme).success) customTheme = saved.customTheme;
                  updateSelection({ themeId, customTheme });
                }}
              />
              <TextInput
                label={t("studio.searchControls")}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              {data.branding.lockPrimaryColor && (
                <Text size="xs" c="dimmed">
                  {t("editor.lockedPrimary")}
                </Text>
              )}
              {search ? (
                <Stack gap="sm">{visibleControls.map(renderControl)}</Stack>
              ) : (
                <Accordion
                  value={panel}
                  onChange={setPanel}
                  variant="separated"
                  mah="65vh"
                  style={{ overflowY: "auto" }}
                >
                  {themeControlGroups.map((group) => (
                    <Accordion.Item key={group} value={group}>
                      <Accordion.Control>{t(`studio.groups.${group}`)}</Accordion.Control>
                      <Accordion.Panel>
                        {panel === group && (
                          <Stack gap="sm">
                            {group === "surfaces" && (
                              <Select
                                label={t("studio.component")}
                                data={[
                                  ...new Set(
                                    themeControls
                                      .filter((item) => item.group === "surfaces")
                                      .flatMap((item) => (item.component ? [item.component] : [])),
                                  ),
                                ]}
                                value={component}
                                onChange={setComponent}
                                allowDeselect={false}
                              />
                            )}
                            {group === "layout" && (
                              <ThemeLayoutControls
                                document={document}
                                effective={effective}
                                disabled={Boolean(jsonError)}
                                onChange={updateControls}
                                renderControl={renderControl}
                              />
                            )}
                            {group !== "layout" &&
                              visibleControls.filter((item) => item.group === group).map(renderControl)}
                          </Stack>
                        )}
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                  <Accordion.Item value="json">
                    <Accordion.Control>{t("editor.json")}</Accordion.Control>
                    <Accordion.Panel>
                      {panel === "json" && (
                        <Stack>
                          <Textarea
                            label={t("editor.json")}
                            description={t("editor.jsonHint")}
                            value={jsonText ?? JSON.stringify(document, null, 2)}
                            onChange={(event) => updateJson(event.currentTarget.value)}
                            error={Boolean(jsonError)}
                            spellCheck={false}
                            rows={20}
                            styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                          />
                          <CopyButton value={JSON.stringify(document, null, 2)}>
                            {({ copied, copy }) => (
                              <Button variant="default" onClick={copy}>
                                {t(copied ? "editor.copied" : "editor.copyJson")}
                              </Button>
                            )}
                          </CopyButton>
                          {jsonError && (
                            <Button
                              variant="subtle"
                              onClick={() => {
                                setJsonText(null);
                                setJsonError(null);
                              }}
                            >
                              {t("editor.discardJson")}
                            </Button>
                          )}
                        </Stack>
                      )}
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Box pos="sticky" top="calc(var(--app-shell-header-height, 0px) + var(--mantine-spacing-md))">
            <Stack gap="sm">
              <Group justify="space-between">
                <Select
                  label={t("studio.previewSurface")}
                  value={surface}
                  allowDeselect={false}
                  onChange={(value) => {
                    if (value) setSurface(value as typeof surface);
                  }}
                  data={[
                    { value: "board", label: t("studio.sampleBoard") },
                    { value: "components", label: t("studio.components") },
                    { value: "overlays", label: t("studio.overlays") },
                    { value: "typography", label: t("studio.typography") },
                    ...(boards.length ? [{ value: "liveBoard", label: t("studio.liveBoard") }] : []),
                  ]}
                />
                <Select
                  label={t("studio.viewport")}
                  value={width}
                  allowDeselect={false}
                  onChange={setWidth}
                  data={[
                    { value: "100%", label: t("studio.responsive") },
                    { value: "768px", label: t("studio.tablet") },
                    { value: "390px", label: t("studio.mobile") },
                  ]}
                />
                <SegmentedControl
                  aria-label={t("editor.previewColorScheme")}
                  value={scheme}
                  onChange={(value) => setSchemeOverride(value as "light" | "dark")}
                  data={[
                    { value: "light", label: common("colorScheme.options.light") },
                    { value: "dark", label: common("colorScheme.options.dark") },
                  ]}
                />
              </Group>
              {surface === "liveBoard" && (
                <>
                  <Select
                    label={t("studio.liveBoard")}
                    data={boards.map(({ name }) => ({ value: name, label: name }))}
                    value={boardName}
                    allowDeselect={false}
                    onChange={setBoardName}
                  />
                  <Text size="xs" c="dimmed">
                    {t("studio.boardReadOnly")}
                  </Text>
                </>
              )}
              <Switch
                label={t("studio.includeCustomCss")}
                checked={includeCustomCss}
                onChange={(event) => setIncludeCustomCss(event.currentTarget.checked)}
              />
              <ThemePreviewFrame message={message} boardName={boardName} width={width ?? "100%"} />
            </Stack>
          </Box>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
